import { Question, QuestionInput, QuestionType } from '@/types';

/** Client-side copy of the backend QuestionValidator rules. */

export const BLANK_MARKER = '___';
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const TRUE_FALSE_OPTIONS = ['True', 'False'];

export const QUESTION_TYPES: QuestionType[] = [
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'FILL_IN_THE_BLANK',
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Single choice',
    MULTIPLE_CHOICE: 'Multiple choice',
    TRUE_FALSE: 'True / False',
    FILL_IN_THE_BLANK: 'Fill in the blank',
};

export interface QuestionDraft {
    text: string;
    type: QuestionType;
    options: string[];
    correctOptionIndex: number | null;
    correctOptionIndexes: number[];
    acceptedAnswers: string[];
    caseSensitive: boolean;
    explanation: string;
}

export function emptyDraft(type: QuestionType = 'SINGLE_CHOICE'): QuestionDraft {
    return changeDraftType(
        {
            text: '',
            type: 'SINGLE_CHOICE',
            options: ['', ''],
            correctOptionIndex: null,
            correctOptionIndexes: [],
            acceptedAnswers: [],
            caseSensitive: false,
            explanation: '',
        },
        type
    );
}

export function draftFromQuestion(q: Question): QuestionDraft {
    return {
        text: q.text,
        type: q.type,
        options: q.type === 'TRUE_FALSE' ? [...TRUE_FALSE_OPTIONS] : [...(q.options ?? [])],
        correctOptionIndex: q.correctOptionIndex ?? null,
        correctOptionIndexes: [...(q.correctOptionIndexes ?? [])],
        acceptedAnswers: [...(q.acceptedAnswers ?? [])],
        caseSensitive: q.caseSensitive ?? false,
        explanation: q.explanation ?? '',
    };
}

/** Switches type while keeping whatever still makes sense (prompt, options, explanation). */
export function changeDraftType(draft: QuestionDraft, type: QuestionType): QuestionDraft {
    if (draft.type === type) return draft;
    const isChoice = (t: QuestionType) => t === 'SINGLE_CHOICE' || t === 'MULTIPLE_CHOICE';
    let options = draft.options;
    if (type === 'TRUE_FALSE') {
        options = [...TRUE_FALSE_OPTIONS];
    } else if (isChoice(type) && (draft.type === 'TRUE_FALSE' || options.length < MIN_OPTIONS)) {
        options = ['', ''];
    }
    let correctOptionIndex = draft.correctOptionIndex;
    let correctOptionIndexes = draft.correctOptionIndexes;
    if (type === 'MULTIPLE_CHOICE' && draft.type === 'SINGLE_CHOICE') {
        correctOptionIndexes = correctOptionIndex === null ? [] : [correctOptionIndex];
    } else if (type === 'SINGLE_CHOICE' && draft.type === 'MULTIPLE_CHOICE') {
        correctOptionIndex = correctOptionIndexes[0] ?? null;
    } else if (type === 'TRUE_FALSE' || draft.type === 'TRUE_FALSE') {
        correctOptionIndex = null;
        correctOptionIndexes = [];
    }
    return { ...draft, type, options, correctOptionIndex, correctOptionIndexes };
}

export function insertBlank(text: string, cursor?: number | null): string {
    const at = cursor ?? text.length;
    const before = text.slice(0, at);
    const after = text.slice(at);
    const padBefore = before && !before.endsWith(' ') ? ' ' : '';
    const padAfter = after && !after.startsWith(' ') ? ' ' : '';
    return `${before}${padBefore}${BLANK_MARKER}${padAfter}${after}`;
}

export type DraftValidation = { input: QuestionInput; error: null } | { input: null; error: string };

function fail(error: string): DraftValidation {
    return { input: null, error };
}

function validOptions(options: string[]): string[] | string {
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
        return `Choice questions need between ${MIN_OPTIONS} and ${MAX_OPTIONS} options`;
    }
    if (options.some((o) => !o.trim())) return 'Options cannot be blank';
    return options.map((o) => o.trim());
}

export function validateDraft(draft: QuestionDraft): DraftValidation {
    const text = draft.text.trim();
    if (!text) return fail('Question text is required');
    const explanation = draft.explanation.trim() || undefined;

    switch (draft.type) {
        case 'SINGLE_CHOICE': {
            const options = validOptions(draft.options);
            if (typeof options === 'string') return fail(options);
            const index = draft.correctOptionIndex;
            if (index === null || index < 0 || index >= options.length) {
                return fail('Mark the correct option');
            }
            return {
                input: { text, type: draft.type, options, correctOptionIndex: index, explanation },
                error: null,
            };
        }
        case 'MULTIPLE_CHOICE': {
            const options = validOptions(draft.options);
            if (typeof options === 'string') return fail(options);
            const indexes = Array.from(new Set(draft.correctOptionIndexes))
                .filter((i) => i >= 0 && i < options.length)
                .sort((a, b) => a - b);
            if (indexes.length === 0) return fail('Mark at least one correct option');
            return {
                input: {
                    text,
                    type: draft.type,
                    options,
                    correctOptionIndexes: indexes,
                    explanation,
                },
                error: null,
            };
        }
        case 'TRUE_FALSE': {
            const index = draft.correctOptionIndex;
            if (index !== 0 && index !== 1) return fail('Choose True or False');
            return {
                input: {
                    text,
                    type: draft.type,
                    options: [...TRUE_FALSE_OPTIONS],
                    correctOptionIndex: index,
                    explanation,
                },
                error: null,
            };
        }
        case 'FILL_IN_THE_BLANK': {
            if (!text.includes(BLANK_MARKER)) {
                return fail(`Add a blank (${BLANK_MARKER}) to the question`);
            }
            const accepted = Array.from(
                new Set(draft.acceptedAnswers.map((a) => a.trim()).filter(Boolean))
            );
            if (accepted.length === 0) return fail('Add at least one accepted answer');
            return {
                input: {
                    text,
                    type: draft.type,
                    acceptedAnswers: accepted,
                    caseSensitive: draft.caseSensitive,
                    explanation,
                },
                error: null,
            };
        }
        default:
            return fail('Unsupported question type');
    }
}

/** Human readable correct answer for lists and result screens. */
export function describeAnswer(q: QuestionInput): string {
    const options = q.options ?? [];
    switch (q.type) {
        case 'SINGLE_CHOICE':
        case 'TRUE_FALSE':
            return q.correctOptionIndex == null ? '' : options[q.correctOptionIndex] ?? '';
        case 'MULTIPLE_CHOICE':
            return (q.correctOptionIndexes ?? []).map((i) => options[i]).filter(Boolean).join(', ');
        case 'FILL_IN_THE_BLANK':
            return (q.acceptedAnswers ?? []).join(' / ');
        default:
            return '';
    }
}
