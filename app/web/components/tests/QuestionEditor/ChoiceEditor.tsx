'use client';
import React, { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_OPTIONS, MIN_OPTIONS, QuestionDraft } from '@/utils/questionForm';

interface ChoiceEditorProps {
    draft: QuestionDraft;
    onChange: (draft: QuestionDraft) => void;
}

/** Option list for single choice (radio) and multiple choice (checkboxes). */
export default function ChoiceEditor({
    draft,
    onChange,
}: Readonly<ChoiceEditorProps>) {
    const multiple = draft.type === 'MULTIPLE_CHOICE';
    const groupName = useId();

    const isCorrect = (i: number) =>
        multiple
            ? draft.correctOptionIndexes.includes(i)
            : draft.correctOptionIndex === i;

    const toggleCorrect = (i: number) => {
        if (!multiple) {
            onChange({ ...draft, correctOptionIndex: i });
            return;
        }
        const next = isCorrect(i)
            ? draft.correctOptionIndexes.filter((x) => x !== i)
            : [...draft.correctOptionIndexes, i].sort((a, b) => a - b);
        onChange({ ...draft, correctOptionIndexes: next });
    };

    const setOption = (i: number, value: string) => {
        const options = [...draft.options];
        options[i] = value;
        onChange({ ...draft, options });
    };

    const removeOption = (i: number) => {
        const shift = (x: number) => (x > i ? x - 1 : x);
        onChange({
            ...draft,
            options: draft.options.filter((_, idx) => idx !== i),
            correctOptionIndex:
                draft.correctOptionIndex === i ||
                draft.correctOptionIndex === null
                    ? null
                    : shift(draft.correctOptionIndex),
            correctOptionIndexes: draft.correctOptionIndexes
                .filter((x) => x !== i)
                .map(shift),
        });
    };

    return (
        <div className="space-y-2" data-testid="choice-editor">
            <p className="font-bold">
                Options{' '}
                <span className="font-normal text-stone-500">
                    (
                    {multiple
                        ? 'tick every correct option'
                        : 'pick the correct option'}
                    )
                </span>
            </p>
            {draft.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name={groupName}
                        aria-label={`Mark option ${i + 1} as correct`}
                        data-testid={`question-option-correct-${i}`}
                        checked={isCorrect(i)}
                        onChange={() => toggleCorrect(i)}
                        className="h-4 w-4 accent-emerald-600 cursor-pointer"
                    />
                    <input
                        type="text"
                        data-testid={`question-option-input-${i}`}
                        placeholder={`Option ${i + 1}`}
                        value={option}
                        onChange={(e) => setOption(i, e.target.value)}
                        className="flex-1 p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                    />
                    <button
                        type="button"
                        aria-label={`Remove option ${i + 1}`}
                        data-testid={`btn-remove-option-${i}`}
                        disabled={draft.options.length <= MIN_OPTIONS}
                        onClick={() => removeOption(i)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                type="button"
                data-testid="btn-add-option"
                disabled={draft.options.length >= MAX_OPTIONS}
                onClick={() =>
                    onChange({ ...draft, options: [...draft.options, ''] })
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--theme-secondary)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
                <Plus className="w-3.5 h-3.5" />
                Add option
            </button>
        </div>
    );
}
