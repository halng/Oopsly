import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuestionEditor from '@/components/tests/QuestionEditor';
import ChoiceEditor from '@/components/tests/QuestionEditor/ChoiceEditor';
import FillInTheBlankEditor from '@/components/tests/QuestionEditor/FillInTheBlankEditor';
import TrueFalseEditor from '@/components/tests/QuestionEditor/TrueFalseEditor';
import { emptyDraft, QuestionDraft } from '@/utils/questionForm';

const draftOf = (extra: Partial<QuestionDraft> = {}): QuestionDraft => ({
    ...emptyDraft(),
    ...extra,
});

describe('ChoiceEditor', () => {
    it('renders radios for single choice and selects the correct option', async () => {
        const onChange = vi.fn();
        const draft = draftOf({ options: ['a', 'b'] });
        render(<ChoiceEditor draft={draft} onChange={onChange} />);
        expect(screen.getByText(/pick the correct option/)).toBeInTheDocument();
        expect(screen.getByTestId('question-option-correct-0')).toHaveAttribute(
            'type',
            'radio'
        );
        await userEvent.click(screen.getByTestId('question-option-correct-1'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            correctOptionIndex: 1,
        });
    });

    it('renders checkboxes for multiple choice and toggles sorted indexes', async () => {
        const onChange = vi.fn();
        const draft = draftOf({
            type: 'MULTIPLE_CHOICE',
            options: ['a', 'b', 'c'],
            correctOptionIndexes: [2],
        });
        render(<ChoiceEditor draft={draft} onChange={onChange} />);
        expect(
            screen.getByText(/tick every correct option/)
        ).toBeInTheDocument();
        expect(screen.getByTestId('question-option-correct-2')).toBeChecked();
        await userEvent.click(screen.getByTestId('question-option-correct-0'));
        expect(onChange).toHaveBeenLastCalledWith({
            ...draft,
            correctOptionIndexes: [0, 2],
        });
        await userEvent.click(screen.getByTestId('question-option-correct-2'));
        expect(onChange).toHaveBeenLastCalledWith({
            ...draft,
            correctOptionIndexes: [],
        });
    });

    it('edits option text', async () => {
        const onChange = vi.fn();
        render(
            <ChoiceEditor
                draft={draftOf({ options: ['', ''] })}
                onChange={onChange}
            />
        );
        await userEvent.type(
            screen.getByTestId('question-option-input-1'),
            'x'
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ options: ['', 'x'] })
        );
    });

    it('adds options up to the maximum', async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <ChoiceEditor
                draft={draftOf({ options: ['a', 'b'] })}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByTestId('btn-add-option'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ options: ['a', 'b', ''] })
        );
        rerender(
            <ChoiceEditor
                draft={draftOf({ options: ['1', '2', '3', '4', '5', '6'] })}
                onChange={onChange}
            />
        );
        expect(screen.getByTestId('btn-add-option')).toBeDisabled();
    });

    it('disables removal at the minimum number of options', () => {
        render(
            <ChoiceEditor
                draft={draftOf({ options: ['a', 'b'] })}
                onChange={vi.fn()}
            />
        );
        expect(screen.getByTestId('btn-remove-option-0')).toBeDisabled();
    });

    it('removes an option and shifts the single-choice answer', async () => {
        const onChange = vi.fn();
        const draft = draftOf({
            options: ['a', 'b', 'c'],
            correctOptionIndex: 2,
        });
        render(<ChoiceEditor draft={draft} onChange={onChange} />);
        await userEvent.click(screen.getByTestId('btn-remove-option-0'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            options: ['b', 'c'],
            correctOptionIndex: 1,
            correctOptionIndexes: [],
        });
    });

    it('clears the answer when the correct option is removed or none is set', async () => {
        const onChange = vi.fn();
        const draft = draftOf({
            options: ['a', 'b', 'c'],
            correctOptionIndex: 1,
        });
        const { rerender } = render(
            <ChoiceEditor draft={draft} onChange={onChange} />
        );
        await userEvent.click(screen.getByTestId('btn-remove-option-1'));
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ correctOptionIndex: null })
        );
        rerender(
            <ChoiceEditor
                draft={{ ...draft, correctOptionIndex: null }}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByTestId('btn-remove-option-0'));
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ correctOptionIndex: null })
        );
    });

    it('removes and shifts multiple-choice answers', async () => {
        const onChange = vi.fn();
        const draft = draftOf({
            type: 'MULTIPLE_CHOICE',
            options: ['a', 'b', 'c', 'd'],
            correctOptionIndexes: [0, 1, 3],
        });
        render(<ChoiceEditor draft={draft} onChange={onChange} />);
        await userEvent.click(screen.getByTestId('btn-remove-option-1'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                options: ['a', 'c', 'd'],
                correctOptionIndexes: [0, 2],
            })
        );
    });
});

describe('FillInTheBlankEditor', () => {
    const fillDraft = (extra: Partial<QuestionDraft> = {}) =>
        draftOf({ type: 'FILL_IN_THE_BLANK', ...extra });

    it('adds a trimmed answer with the Add button and clears the input', async () => {
        const onChange = vi.fn();
        const draft = fillDraft();
        render(<FillInTheBlankEditor draft={draft} onChange={onChange} />);
        const input = screen.getByTestId('accepted-answer-input');
        await userEvent.type(input, '  Paris  ');
        await userEvent.click(screen.getByTestId('btn-add-accepted-answer'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            acceptedAnswers: ['Paris'],
        });
        expect(input).toHaveValue('');
    });

    it('adds an answer on Enter', async () => {
        const onChange = vi.fn();
        render(
            <FillInTheBlankEditor draft={fillDraft()} onChange={onChange} />
        );
        await userEvent.type(
            screen.getByTestId('accepted-answer-input'),
            'Rome{enter}'
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ acceptedAnswers: ['Rome'] })
        );
    });

    it('ignores blank input and does not duplicate, but still clears', async () => {
        const onChange = vi.fn();
        render(
            <FillInTheBlankEditor
                draft={fillDraft({ acceptedAnswers: ['Paris'] })}
                onChange={onChange}
            />
        );
        const input = screen.getByTestId('accepted-answer-input');
        await userEvent.type(input, '   {enter}');
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.clear(input);
        await userEvent.type(input, 'Paris{enter}');
        expect(onChange).not.toHaveBeenCalled();
        expect(input).toHaveValue('');
    });

    it('lists chips and removes one', async () => {
        const onChange = vi.fn();
        const draft = fillDraft({ acceptedAnswers: ['A', 'B'] });
        render(<FillInTheBlankEditor draft={draft} onChange={onChange} />);
        expect(screen.getAllByTestId('accepted-answer-chip')).toHaveLength(2);
        await userEvent.click(screen.getByLabelText('Remove A'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            acceptedAnswers: ['B'],
        });
    });

    it('toggles case sensitivity', async () => {
        const onChange = vi.fn();
        const draft = fillDraft();
        render(<FillInTheBlankEditor draft={draft} onChange={onChange} />);
        await userEvent.click(screen.getByTestId('case-sensitive-switch'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            caseSensitive: true,
        });
    });
});

describe('TrueFalseEditor', () => {
    it('shows the active answer and selects True / False', async () => {
        const onChange = vi.fn();
        const draft = draftOf({
            type: 'TRUE_FALSE',
            options: ['True', 'False'],
            correctOptionIndex: 0,
        });
        render(<TrueFalseEditor draft={draft} onChange={onChange} />);
        expect(screen.getByTestId('btn-true-false-true')).toHaveAttribute(
            'aria-checked',
            'true'
        );
        expect(screen.getByTestId('btn-true-false-false')).toHaveAttribute(
            'aria-checked',
            'false'
        );
        await userEvent.click(screen.getByTestId('btn-true-false-false'));
        expect(onChange).toHaveBeenCalledWith({
            ...draft,
            correctOptionIndex: 1,
        });
    });

    it('highlights False when it is the answer', () => {
        render(
            <TrueFalseEditor
                draft={draftOf({ type: 'TRUE_FALSE', correctOptionIndex: 1 })}
                onChange={vi.fn()}
            />
        );
        expect(screen.getByTestId('btn-true-false-false').className).toContain(
            'bg-rose-600'
        );
    });
});

describe('QuestionEditor', () => {
    const setup = (initial = emptyDraft(), onSubmit = vi.fn()) => {
        const onCancel = vi.fn();
        render(
            <QuestionEditor
                initial={initial}
                onSubmit={onSubmit}
                onCancel={onCancel}
            />
        );
        return { onSubmit, onCancel };
    };
    const save = () => userEvent.click(screen.getByTestId('btn-save-question'));

    it('validates and shows an error, clearing it on edit', async () => {
        const { onSubmit } = setup();
        await save();
        expect(screen.getByTestId('question-editor-error')).toHaveTextContent(
            'Question text is required'
        );
        expect(onSubmit).not.toHaveBeenCalled();
        await userEvent.type(screen.getByTestId('question-text-input'), 'Q');
        expect(screen.queryByTestId('question-editor-error')).toBeNull();
    });

    it('submits a single-choice question', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        setup(emptyDraft(), onSubmit);
        await userEvent.type(
            screen.getByTestId('question-text-input'),
            'Largest planet?'
        );
        await userEvent.type(
            screen.getByTestId('question-option-input-0'),
            'Mars'
        );
        await userEvent.type(
            screen.getByTestId('question-option-input-1'),
            'Jupiter'
        );
        await userEvent.click(screen.getByTestId('question-option-correct-1'));
        await userEvent.type(
            screen.getByTestId('question-explanation-input'),
            'Gas giant'
        );
        await save();
        await waitFor(() =>
            expect(onSubmit).toHaveBeenCalledWith({
                text: 'Largest planet?',
                type: 'SINGLE_CHOICE',
                options: ['Mars', 'Jupiter'],
                correctOptionIndex: 1,
                explanation: 'Gas giant',
            })
        );
    });

    it('switches between the four editors', async () => {
        setup();
        expect(screen.getByTestId('choice-editor')).toBeInTheDocument();
        await userEvent.click(
            screen.getByTestId('btn-question-type-TRUE_FALSE')
        );
        expect(screen.getByTestId('true-false-editor')).toBeInTheDocument();
        await userEvent.click(
            screen.getByTestId('btn-question-type-FILL_IN_THE_BLANK')
        );
        expect(screen.getByTestId('fill-blank-editor')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/capital of France/)).toBeVisible();
        await userEvent.click(
            screen.getByTestId('btn-question-type-MULTIPLE_CHOICE')
        );
        expect(screen.getByTestId('choice-editor')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Write the question')).toBeVisible();
    });

    it('inserts a blank at the end or at the cursor and submits a fill-in question', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        setup(emptyDraft('FILL_IN_THE_BLANK'), onSubmit);
        const text = screen.getByTestId('question-text-input');
        await userEvent.type(text, 'Capital of France is');
        await userEvent.click(screen.getByTestId('btn-insert-blank'));
        expect(text).toHaveValue('Capital of France is ___');
        await userEvent.type(
            screen.getByTestId('accepted-answer-input'),
            'Paris{enter}'
        );
        await save();
        await waitFor(() =>
            expect(onSubmit).toHaveBeenCalledWith({
                text: 'Capital of France is ___',
                type: 'FILL_IN_THE_BLANK',
                acceptedAnswers: ['Paris'],
                caseSensitive: false,
                explanation: undefined,
            })
        );
    });

    it('shows the error message of a rejected submit and re-enables saving', async () => {
        const onSubmit = vi
            .fn()
            .mockRejectedValueOnce(new Error('Server error'))
            .mockRejectedValueOnce('nope');
        setup(
            draftOf({
                type: 'TRUE_FALSE',
                text: 'Sky is blue',
                options: ['True', 'False'],
                correctOptionIndex: 0,
            }),
            onSubmit
        );
        await save();
        expect(await screen.findByText('Server error')).toBeInTheDocument();
        expect(screen.getByTestId('btn-save-question')).toBeEnabled();
        await save();
        expect(
            await screen.findByText('Could not save the question')
        ).toBeInTheDocument();
    });

    it('shows Saving... while pending and honours a custom submit label', async () => {
        let resolve!: () => void;
        const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
        render(
            <QuestionEditor
                initial={draftOf({
                    type: 'TRUE_FALSE',
                    text: 'Q',
                    options: ['True', 'False'],
                    correctOptionIndex: 1,
                })}
                submitLabel="Update question"
                testId="custom-editor"
                onSubmit={onSubmit}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByTestId('custom-editor')).toBeInTheDocument();
        expect(screen.getByText('Update question')).toBeInTheDocument();
        await save();
        expect(await screen.findByText('Saving...')).toBeInTheDocument();
        expect(screen.getByTestId('btn-save-question')).toBeDisabled();
        resolve();
        await waitFor(() =>
            expect(screen.getByTestId('btn-save-question')).toBeEnabled()
        );
    });

    it('calls onCancel', async () => {
        const { onCancel } = setup();
        await userEvent.click(screen.getByTestId('btn-cancel-question'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
