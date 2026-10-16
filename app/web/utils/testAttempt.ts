import { TestAttemptQuestion, TestSubmission } from '@/types';
import { shuffle } from './study';
import type { QuestionAnswer } from '@/components/tests/QuestionRenderer';

/**
 * Display order of options per question (display position -> original index).
 * True/False keeps its natural order and fill in the blank has no options.
 */
export function buildOptionOrders(
    questions: readonly TestAttemptQuestion[],
    random: () => number = Math.random
): Record<string, number[]> {
    const orders: Record<string, number[]> = {};
    for (const q of questions) {
        const natural = q.options.map((_, i) => i);
        orders[q.id] =
            q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE'
                ? shuffle(natural, random)
                : natural;
    }
    return orders;
}

/** Answers are already kept as original option indexes, so they go out unchanged. */
export function buildSubmission(
    questions: readonly TestAttemptQuestion[],
    answers: Record<string, QuestionAnswer>,
    timeSpentSeconds: number
): TestSubmission {
    const submission: TestSubmission = {
        answers: {},
        multiAnswers: {},
        textAnswers: {},
        timeSpentSeconds: Math.max(0, Math.round(timeSpentSeconds)),
    };
    for (const q of questions) {
        const a = answers[q.id];
        if (!a) continue;
        if (q.type === 'MULTIPLE_CHOICE') {
            if (a.indexes?.length) submission.multiAnswers[q.id] = [...a.indexes];
        } else if (q.type === 'FILL_IN_THE_BLANK') {
            if (a.text?.trim()) submission.textAnswers[q.id] = a.text.trim();
        } else if (a.index !== undefined) {
            submission.answers[q.id] = a.index;
        }
    }
    return submission;
}
