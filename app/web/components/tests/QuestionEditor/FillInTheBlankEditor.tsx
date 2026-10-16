'use client';
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { QuestionDraft } from '@/utils/questionForm';

interface FillInTheBlankEditorProps {
    draft: QuestionDraft;
    onChange: (draft: QuestionDraft) => void;
}

export default function FillInTheBlankEditor({
    draft,
    onChange,
}: Readonly<FillInTheBlankEditorProps>) {
    const [pending, setPending] = useState('');

    const addAnswer = () => {
        const value = pending.trim();
        if (!value) return;
        if (!draft.acceptedAnswers.includes(value)) {
            onChange({ ...draft, acceptedAnswers: [...draft.acceptedAnswers, value] });
        }
        setPending('');
    };

    return (
        <div className="space-y-2" data-testid="fill-blank-editor">
            <p className="font-bold">Accepted answers</p>
            {draft.acceptedAnswers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {draft.acceptedAnswers.map((answer) => (
                        <span
                            key={answer}
                            data-testid="accepted-answer-chip"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                        >
                            {answer}
                            <button
                                type="button"
                                aria-label={`Remove ${answer}`}
                                onClick={() =>
                                    onChange({
                                        ...draft,
                                        acceptedAnswers: draft.acceptedAnswers.filter(
                                            (a) => a !== answer
                                        ),
                                    })
                                }
                                className="cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    data-testid="accepted-answer-input"
                    placeholder="Type an accepted answer and press Enter"
                    value={pending}
                    onChange={(e) => setPending(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addAnswer();
                        }
                    }}
                    className="flex-1 p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
                <button
                    type="button"
                    data-testid="btn-add-accepted-answer"
                    onClick={addAnswer}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                </button>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    role="switch"
                    data-testid="case-sensitive-switch"
                    checked={draft.caseSensitive}
                    onChange={(e) => onChange({ ...draft, caseSensitive: e.target.checked })}
                    className="h-4 w-4 accent-emerald-600"
                />
                Case sensitive
            </label>
        </div>
    );
}
