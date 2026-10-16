import { describe, expect, it } from 'vitest';
import { buildOptionOrders, buildSubmission } from '@/utils/testAttempt';
import { TestAttemptQuestion } from '@/types';

const questions: TestAttemptQuestion[] = [
    {
        id: 'q1',
        text: 'Pick one',
        type: 'SINGLE_CHOICE',
        options: ['A', 'B', 'C'],
    },
    {
        id: 'q2',
        text: 'Pick all',
        type: 'MULTIPLE_CHOICE',
        options: ['X', 'Y'],
    },
    { id: 'q3', text: 'T/F', type: 'TRUE_FALSE', options: ['True', 'False'] },
    { id: 'q4', text: 'Fill ___', type: 'FILL_IN_THE_BLANK', options: [] },
];

describe('testAttempt', () => {
    it('shuffles choice options but leaves True/False in place', () => {
        const seq = [0.99, 0.01, 0.5, 0.2];
        const orders = buildOptionOrders(questions, () => seq.shift() ?? 0);
        expect(new Set(orders.q1)).toEqual(new Set([0, 1, 2]));
        expect(orders.q1).not.toEqual([0, 1, 2]);
        expect(orders.q3).toEqual([0, 1]);
        expect(orders.q4).toEqual([]);
    });

    it('splits answers by type for the submit payload', () => {
        expect(
            buildSubmission(
                questions,
                {
                    q1: { index: 2 },
                    q2: { indexes: [1, 0] },
                    q3: { index: 1 },
                    q4: { text: '  Paris  ' },
                },
                42.4
            )
        ).toEqual({
            answers: { q1: 2, q3: 1 },
            multiAnswers: { q2: [1, 0] },
            textAnswers: { q4: 'Paris' },
            timeSpentSeconds: 42,
        });
    });
});
