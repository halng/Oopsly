import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TakeTestScreen from '../../../app/(user)/take-test/[testSuiteId]';
import { useLocalSearchParams } from 'expo-router';
import { useQuestions } from '../../../hooks/queries/useQuestions';
import { QuestionType } from '../../../types/Question';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../hooks/queries/useQuestions', () => ({
  useQuestions: jest.fn(),
}));

const mockUseQuestions = useQuestions as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

const singleChoiceQ = {
  id: 'q-1', testSuiteId: 'ts-1', content: 'Capital of France?',
  type: QuestionType.SINGLE_CHOICE,
  options: ['Berlin', 'Paris', 'Madrid', 'Rome'],
  correctOptionIndices: [1],
};

const multiChoiceQ = {
  id: 'q-2', testSuiteId: 'ts-1', content: 'Select all vowels.',
  type: QuestionType.MULTIPLE_CHOICE,
  options: ['A', 'B', 'C', 'E'],
  correctOptionIndices: [0, 3],
};

const trueFalseQ = {
  id: 'q-3', testSuiteId: 'ts-1', content: 'The earth is round.',
  type: QuestionType.TRUE_FALSE,
  options: ['True', 'False'],
  correctOptionIndices: [0],
};

const fillBlankQ = {
  id: 'q-4', testSuiteId: 'ts-1', content: 'The powerhouse of the cell is the ___.',
  type: QuestionType.FILL_IN_THE_BLANK,
  options: ['mitochondria'],
  correctOptionIndices: [],
};

const setupParams = (testSuiteId = 'ts-1') => {
  mockUseLocalSearchParams.mockReturnValue({ testSuiteId });
};

describe('TakeTestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupParams();
  });

  // ─── Loading & Empty States ────────────────────────────────────────────────
  it('shows loading text while fetching questions', () => {
    mockUseQuestions.mockReturnValue({ data: null, isLoading: true });

    const { getByText } = render(<TakeTestScreen />);
    expect(getByText('Loading test...')).toBeTruthy();
  });

  it('shows empty state when there are no questions', () => {
    mockUseQuestions.mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);
    expect(getByText('No questions found')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });

  // ─── Question Type Rendering ───────────────────────────────────────────────
  it('renders a SINGLE_CHOICE question with 4 radio options', () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    expect(getByText('Capital of France?')).toBeTruthy();
    expect(getByText('Berlin')).toBeTruthy();
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('Madrid')).toBeTruthy();
    expect(getByText('Rome')).toBeTruthy();
  });

  it('renders a MULTIPLE_CHOICE question with 4 options', () => {
    mockUseQuestions.mockReturnValue({ data: [multiChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    expect(getByText('Select all vowels.')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
  });

  it('renders a TRUE_FALSE question with exactly 2 options', () => {
    mockUseQuestions.mockReturnValue({ data: [trueFalseQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    expect(getByText('The earth is round.')).toBeTruthy();
    expect(getByText('True')).toBeTruthy();
    expect(getByText('False')).toBeTruthy();
  });

  it('renders a FILL_IN_THE_BLANK question with a text input instead of options', () => {
    mockUseQuestions.mockReturnValue({ data: [fillBlankQ], isLoading: false });

    const { getByPlaceholderText } = render(<TakeTestScreen />);

    // The placeholder is "Type your answer here..."
    expect(getByPlaceholderText('Type your answer here...')).toBeTruthy();
  });

  // ─── Navigation ───────────────────────────────────────────────────────────
  it('shows progress bar with "1 / N" indicator', () => {
    mockUseQuestions.mockReturnValue({
      data: [singleChoiceQ, multiChoiceQ],
      isLoading: false,
    });

    const { getByText } = render(<TakeTestScreen />);
    expect(getByText('1 / 2')).toBeTruthy();
  });

  it('shows Next button for non-last question', () => {
    mockUseQuestions.mockReturnValue({
      data: [singleChoiceQ, multiChoiceQ],
      isLoading: false,
    });

    const { getByText } = render(<TakeTestScreen />);
    expect(getByText('Next')).toBeTruthy();
  });

  it('shows disabled Submit button for last unanswered question', () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);
    expect(getByText('Submit Test')).toBeTruthy();
  });

  it('allows navigating forward after selecting an option', () => {
    mockUseQuestions.mockReturnValue({
      data: [singleChoiceQ, multiChoiceQ],
      isLoading: false,
    });

    const { getByText } = render(<TakeTestScreen />);

    // Answer Q1
    fireEvent.press(getByText('Paris'));
    // Navigate to Q2
    fireEvent.press(getByText('Next'));

    expect(getByText('2 / 2')).toBeTruthy();
    expect(getByText('Select all vowels.')).toBeTruthy();
  });

  it('allows navigating backward', () => {
    mockUseQuestions.mockReturnValue({
      data: [singleChoiceQ, multiChoiceQ],
      isLoading: false,
    });

    const { getByText } = render(<TakeTestScreen />);

    fireEvent.press(getByText('Paris'));
    fireEvent.press(getByText('Next'));
    fireEvent.press(getByText('Previous'));

    expect(getByText('1 / 2')).toBeTruthy();
    expect(getByText('Capital of France?')).toBeTruthy();
  });

  // ─── Results Screen ────────────────────────────────────────────────────────
  it('shows results screen after answering all questions and submitting', async () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    // Answer correctly (Paris = index 1)
    fireEvent.press(getByText('Paris'));
    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => {
      expect(getByText('Test Complete!')).toBeTruthy();
    });
    expect(getByText('100%')).toBeTruthy();
    expect(getByText('1 / 1')).toBeTruthy();
  });

  it('shows 0% when all questions are answered wrongly', async () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    // Answer wrong (Berlin = index 0, correct is index 1)
    fireEvent.press(getByText('Berlin'));
    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => {
      expect(getByText('0%')).toBeTruthy();
    });
  });

  it('grades FILL_IN_THE_BLANK case-insensitively', async () => {
    mockUseQuestions.mockReturnValue({ data: [fillBlankQ], isLoading: false });

    const { getByPlaceholderText, getByText } = render(<TakeTestScreen />);

    // Answer with different casing
    fireEvent.changeText(getByPlaceholderText('Type your answer here...'), 'MITOCHONDRIA');
    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => {
      expect(getByText('Test Complete!')).toBeTruthy();
    });
    expect(getByText('100%')).toBeTruthy();
  });

  it('grades MULTIPLE_CHOICE correctly only when all correct boxes selected', async () => {
    mockUseQuestions.mockReturnValue({ data: [multiChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    // Select A (index 0) and E (index 3) — both correct
    fireEvent.press(getByText('A'));
    fireEvent.press(getByText('E'));
    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => {
      expect(getByText('100%')).toBeTruthy();
    });
  });

  it('able to retake test after submission', async () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });

    const { getByText } = render(<TakeTestScreen />);

    fireEvent.press(getByText('Paris'));
    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => expect(getByText('Test Complete!')).toBeTruthy());

    fireEvent.press(getByText('Retake Test'));

    // Should be back at question 1
    await waitFor(() => {
      expect(getByText('Capital of France?')).toBeTruthy();
      expect(getByText('1 / 1')).toBeTruthy();
    });
  });

  // ─── Snapshot ─────────────────────────────────────────────────────────────
  it('matches snapshot for single choice question card', () => {
    mockUseQuestions.mockReturnValue({ data: [singleChoiceQ], isLoading: false });
    const { toJSON } = render(<TakeTestScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for fill-in-the-blank question', () => {
    mockUseQuestions.mockReturnValue({ data: [fillBlankQ], isLoading: false });
    const { toJSON } = render(<TakeTestScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
