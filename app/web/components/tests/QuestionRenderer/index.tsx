'use client';
import React, { useId } from 'react';
import { TestAttemptQuestion } from '@/types';
import { BLANK_MARKER } from '@/utils/questionForm';

export interface QuestionAnswer {
    index?: number;
    indexes?: number[];
    text?: string;
}

interface QuestionRendererProps {
    question: TestAttemptQuestion;
    /** Display position -> original option index. */
    order: number[];
    answer: QuestionAnswer | undefined;
    onChange: (answer: QuestionAnswer) => void;
    disabled?: boolean;
}

export function isAnswered(
    question: TestAttemptQuestion,
    answer?: QuestionAnswer
): boolean {
    if (!answer) return false;
    switch (question.type) {
        case 'MULTIPLE_CHOICE':
            return (answer.indexes?.length ?? 0) > 0;
        case 'FILL_IN_THE_BLANK':
            return !!answer.text?.trim();
        default:
            return answer.index !== undefined;
    }
}

function ChoiceRenderer({
    question,
    order,
    answer,
    onChange,
    disabled,
}: Readonly<QuestionRendererProps>) {
    const multiple = question.type === 'MULTIPLE_CHOICE';
    const groupName = useId();
    const selected = (original: number) =>
        multiple
            ? (answer?.indexes ?? []).includes(original)
            : answer?.index === original;

    const toggle = (original: number) => {
        if (!multiple) {
            onChange({ index: original });
            return;
        }
        const current = answer?.indexes ?? [];
        onChange({
            indexes: current.includes(original)
                ? current.filter((i) => i !== original)
                : [...current, original].sort((a, b) => a - b),
        });
    };

    return (
        <div className="space-y-2">
            {multiple && (
                <p
                    data-testid="select-all-note"
                    className="text-xs font-semibold text-[var(--theme-text)]/55"
                >
                    Select all that apply
                </p>
            )}
            {order.map((original, position) => {
                const isOn = selected(original);
                return (
                    <label
                        key={original}
                        data-testid={`answer-option-${position}`}
                        className={`flex items-center gap-3 p-4 rounded-2xl border text-sm cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                            isOn
                                ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_12%,transparent)] study-pop'
                                : 'bg-[var(--theme-card)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]'
                        }`}
                    >
                        <input
                            type={multiple ? 'checkbox' : 'radio'}
                            name={groupName}
                            checked={isOn}
                            disabled={disabled}
                            onChange={() => toggle(original)}
                            className="h-4 w-4 accent-[var(--theme-accent)]"
                        />
                        <span>{question.options[original]}</span>
                    </label>
                );
            })}
        </div>
    );
}

function TrueFalseRenderer({
    question,
    answer,
    onChange,
    disabled,
}: Readonly<QuestionRendererProps>) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {question.options.map((label, i) => {
                const isOn = answer?.index === i;
                return (
                    <button
                        key={label}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isOn}
                        data-testid={`answer-true-false-${i}`}
                        onClick={() => onChange({ index: i })}
                        className={`py-6 rounded-2xl border-2 text-lg font-black cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                            isOn
                                ? i === 0
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 study-pop'
                                    : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 study-pop'
                                : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-[var(--theme-accent)]'
                        }`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function FillInTheBlankRenderer({
    question,
    answer,
    onChange,
    disabled,
}: Readonly<QuestionRendererProps>) {
    const markerAt = question.text.indexOf(BLANK_MARKER);
    const before =
        markerAt === -1 ? question.text : question.text.slice(0, markerAt);
    const after =
        markerAt === -1
            ? ''
            : question.text.slice(markerAt + BLANK_MARKER.length);
    const input = (
        <input
            type="text"
            data-testid="answer-blank-input"
            aria-label="Your answer"
            disabled={disabled}
            value={answer?.text ?? ''}
            onChange={(e) => onChange({ text: e.target.value })}
            className="inline-block mx-1 my-1 min-w-[8rem] px-2 py-1 border-b-2 border-[var(--theme-accent)] bg-transparent text-base font-bold focus:outline-none"
        />
    );
    return (
        <p className="text-lg font-semibold leading-relaxed whitespace-pre-wrap">
            {before}
            {input}
            {after}
        </p>
    );
}

export default function QuestionRenderer(
    props: Readonly<QuestionRendererProps>
) {
    const { question } = props;
    const showPrompt = question.type !== 'FILL_IN_THE_BLANK';
    return (
        <div
            data-testid={`question-renderer-${question.type}`}
            className="space-y-4"
        >
            {showPrompt && (
                <p
                    data-testid="question-prompt"
                    className="text-lg font-semibold whitespace-pre-wrap text-[var(--theme-text)]"
                >
                    {question.text}
                </p>
            )}
            {(question.type === 'SINGLE_CHOICE' ||
                question.type === 'MULTIPLE_CHOICE') && (
                <ChoiceRenderer {...props} />
            )}
            {question.type === 'TRUE_FALSE' && <TrueFalseRenderer {...props} />}
            {question.type === 'FILL_IN_THE_BLANK' && (
                <FillInTheBlankRenderer {...props} />
            )}
        </div>
    );
}
