'use client';
import React, { useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { QuestionInput } from '@/types';
import {
    BLANK_MARKER,
    QUESTION_TYPES,
    QUESTION_TYPE_LABELS,
    QuestionDraft,
    changeDraftType,
    insertBlank,
    validateDraft,
} from '@/utils/questionForm';
import ChoiceEditor from './ChoiceEditor';
import TrueFalseEditor from './TrueFalseEditor';
import FillInTheBlankEditor from './FillInTheBlankEditor';

interface QuestionEditorProps {
    initial: QuestionDraft;
    submitLabel?: string;
    onSubmit: (input: QuestionInput) => Promise<void>;
    onCancel: () => void;
    testId?: string;
}

export default function QuestionEditor({
    initial,
    submitLabel = 'Save question',
    onSubmit,
    onCancel,
    testId = 'question-editor',
}: Readonly<QuestionEditorProps>) {
    const [draft, setDraft] = useState<QuestionDraft>(initial);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const promptRef = useRef<HTMLTextAreaElement>(null);

    const update = (next: QuestionDraft) => {
        setDraft(next);
        if (error) setError(null);
    };

    const handleInsertBlank = () => {
        const cursor = promptRef.current?.selectionStart ?? null;
        update({ ...draft, text: insertBlank(draft.text, cursor) });
        promptRef.current?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = validateDraft(draft);
        if (!result.input) {
            setError(result.error);
            return;
        }
        setIsSaving(true);
        try {
            await onSubmit(result.input);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the question');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form
            data-testid={testId}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-4 text-xs"
        >
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Question type">
                {QUESTION_TYPES.map((type) => (
                    <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={draft.type === type}
                        data-testid={`btn-question-type-${type}`}
                        onClick={() => update(changeDraftType(draft, type))}
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                            draft.type === type
                                ? 'bg-[var(--theme-accent)] text-white'
                                : 'bg-stone-100 dark:bg-stone-800'
                        }`}
                    >
                        {QUESTION_TYPE_LABELS[type]}
                    </button>
                ))}
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`${testId}-prompt`} className="font-bold">
                        Question
                    </label>
                    {draft.type === 'FILL_IN_THE_BLANK' && (
                        <button
                            type="button"
                            data-testid="btn-insert-blank"
                            onClick={handleInsertBlank}
                            className="px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer"
                        >
                            Insert blank {BLANK_MARKER}
                        </button>
                    )}
                </div>
                <textarea
                    id={`${testId}-prompt`}
                    ref={promptRef}
                    rows={2}
                    data-testid="question-text-input"
                    placeholder={
                        draft.type === 'FILL_IN_THE_BLANK'
                            ? `e.g. The capital of France is ${BLANK_MARKER}.`
                            : 'Write the question'
                    }
                    value={draft.text}
                    onChange={(e) => update({ ...draft, text: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
            </div>

            {(draft.type === 'SINGLE_CHOICE' || draft.type === 'MULTIPLE_CHOICE') && (
                <ChoiceEditor draft={draft} onChange={update} />
            )}
            {draft.type === 'TRUE_FALSE' && <TrueFalseEditor draft={draft} onChange={update} />}
            {draft.type === 'FILL_IN_THE_BLANK' && (
                <FillInTheBlankEditor draft={draft} onChange={update} />
            )}

            <div>
                <label htmlFor={`${testId}-explanation`} className="font-bold block mb-1">
                    Explanation <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <textarea
                    id={`${testId}-explanation`}
                    rows={2}
                    data-testid="question-explanation-input"
                    placeholder="Shown after the test is submitted"
                    value={draft.explanation}
                    onChange={(e) => update({ ...draft, explanation: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
            </div>

            {error && (
                <p data-testid="question-editor-error" className="text-rose-600 font-semibold">
                    {error}
                </p>
            )}

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    data-testid="btn-cancel-question"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl border font-bold cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    data-testid="btn-save-question"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : submitLabel}
                </button>
            </div>
        </form>
    );
}
