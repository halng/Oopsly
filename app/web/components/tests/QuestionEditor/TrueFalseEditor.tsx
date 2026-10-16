'use client';
import React from 'react';
import { QuestionDraft, TRUE_FALSE_OPTIONS } from '@/utils/questionForm';

interface TrueFalseEditorProps {
    draft: QuestionDraft;
    onChange: (draft: QuestionDraft) => void;
}

export default function TrueFalseEditor({
    draft,
    onChange,
}: Readonly<TrueFalseEditorProps>) {
    return (
        <div className="space-y-2" data-testid="true-false-editor">
            <p className="font-bold">Correct answer</p>
            <div
                role="radiogroup"
                className="inline-flex rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden"
            >
                {TRUE_FALSE_OPTIONS.map((label, i) => {
                    const active = draft.correctOptionIndex === i;
                    return (
                        <button
                            key={label}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            data-testid={`btn-true-false-${label.toLowerCase()}`}
                            onClick={() =>
                                onChange({ ...draft, correctOptionIndex: i })
                            }
                            className={`px-5 py-2 text-xs font-bold cursor-pointer ${
                                active
                                    ? i === 0
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-rose-600 text-white'
                                    : 'bg-white dark:bg-stone-900'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
