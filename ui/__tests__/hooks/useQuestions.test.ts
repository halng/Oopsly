import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '../../hooks/queries/useQuestions';
import * as QuestionService from '../../services/QuestionService';
import Toast from 'react-native-toast-message';
import { QuestionType } from '../../types/Question';

jest.mock('../../services/QuestionService');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockFetch = QuestionService.fetchQuestionsByTestSuite as jest.Mock;
const mockCreate = QuestionService.createQuestion as jest.Mock;
const mockUpdate = QuestionService.updateQuestion as jest.Mock;
const mockDelete = QuestionService.deleteQuestion as jest.Mock;

const TS_ID = 'ts-123';

const singleQ = {
  id: 'q-1',
  testSuiteId: TS_ID,
  content: 'Capital of France?',
  type: QuestionType.SINGLE_CHOICE,
  options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
  correctOptionIndices: [1],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useQuestions', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('useQuestions (query)', () => {
    it('fetches questions when testSuiteId is provided', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: [singleQ], message: 'ok' });

      const { result } = renderHook(() => useQuestions(TS_ID), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].type).toBe(QuestionType.SINGLE_CHOICE);
    });

    it('is disabled when testSuiteId is empty', () => {
      const { result } = renderHook(() => useQuestions(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws and enters error state when API fails', async () => {
      mockFetch.mockResolvedValue({ isSuccess: false, data: null, message: 'Forbidden' });

      const { result } = renderHook(() => useQuestions(TS_ID), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe('Forbidden');
    });
  });

  describe('useCreateQuestion (mutation)', () => {
    it('shows success Toast and returns data on successful creation', async () => {
      mockCreate.mockResolvedValue({ isSuccess: true, data: singleQ, message: 'Created' });

      const { result } = renderHook(() => useCreateQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          testSuiteId: TS_ID,
          data: {
            content: singleQ.content,
            type: QuestionType.SINGLE_CHOICE,
            options: singleQ.options,
            correctOptionIndices: [1],
          },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Question created successfully' })
      );
    });

    it('shows error Toast on failed creation', async () => {
      mockCreate.mockResolvedValue({ isSuccess: false, data: null, message: 'Duplicate content' });

      const { result } = renderHook(() => useCreateQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          testSuiteId: TS_ID,
          data: {
            content: 'q',
            type: QuestionType.SINGLE_CHOICE,
            options: ['A'],
            correctOptionIndices: [0],
          },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to create question' })
      );
    });

    it('creates FILL_IN_THE_BLANK question correctly', async () => {
      const fillQ = { ...singleQ, type: QuestionType.FILL_IN_THE_BLANK, options: ['mitochondria'], correctOptionIndices: [] };
      mockCreate.mockResolvedValue({ isSuccess: true, data: fillQ, message: 'Created' });

      const { result } = renderHook(() => useCreateQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          testSuiteId: TS_ID,
          data: {
            content: 'Powerhouse of the cell?',
            type: QuestionType.FILL_IN_THE_BLANK,
            options: ['mitochondria'],
            correctOptionIndices: [],
          },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useUpdateQuestion (mutation)', () => {
    it('shows success Toast on update', async () => {
      mockUpdate.mockResolvedValue({ isSuccess: true, data: singleQ, message: 'Updated' });

      const { result } = renderHook(() => useUpdateQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          testSuiteId: TS_ID,
          id: 'q-1',
          data: {
            content: 'Updated?',
            type: QuestionType.SINGLE_CHOICE,
            options: singleQ.options,
            correctOptionIndices: [1],
          },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Question updated successfully' })
      );
    });

    it('shows error Toast on failed update', async () => {
      mockUpdate.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useUpdateQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          testSuiteId: TS_ID,
          id: 'bad-id',
          data: {
            content: 'x',
            type: QuestionType.TRUE_FALSE,
            options: ['True', 'False'],
            correctOptionIndices: [0],
          },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to update question' })
      );
    });
  });

  describe('useDeleteQuestion (mutation)', () => {
    it('shows success Toast on deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: true, data: null, message: 'Deleted' });

      const { result } = renderHook(() => useDeleteQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ testSuiteId: TS_ID, id: 'q-1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Question deleted successfully' })
      );
    });

    it('shows error Toast on failed deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: false, data: null, message: 'Cannot delete' });

      const { result } = renderHook(() => useDeleteQuestion(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ testSuiteId: TS_ID, id: 'q-ghost' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to delete question' })
      );
    });
  });
});
