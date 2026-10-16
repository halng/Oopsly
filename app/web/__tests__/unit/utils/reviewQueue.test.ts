import { describe, expect, it } from 'vitest';
import {
    AGAIN_REINSERT_OFFSET,
    applyGrade,
    buildReviewQueue,
    countQueue,
    nextDueDate,
} from '@/utils/reviewQueue';
import { card } from '@/__tests__/unit/helpers/studyFixtures';

describe('reviewQueue', () => {
    it('caps new and review cards and interleaves them', () => {
        const cards = [
            card({ id: 'n1', repetitions: 0 }),
            card({ id: 'n2', repetitions: 0 }),
            card({ id: 'n3', repetitions: 0 }),
            card({
                id: 'r1',
                repetitions: 2,
                lastReviewedAt: '2026-01-01T00:00:00Z',
                dueDate: '2026-01-01T00:00:00Z',
            }),
            card({
                id: 'r2',
                repetitions: 3,
                lastReviewedAt: '2026-01-01T00:00:00Z',
                dueDate: '2026-01-02T00:00:00Z',
            }),
        ];
        const queue = buildReviewQueue(cards, { newLimit: 2, reviewLimit: 1 });
        expect(queue.map((i) => i.card.id)).toEqual(
            expect.arrayContaining(['n1', 'n2', 'r1'])
        );
        expect(queue).toHaveLength(3);
        expect(countQueue(queue)).toEqual({ new: 2, learning: 0, review: 1 });
    });

    it('puts Again cards back a few places later as learning items', () => {
        const queue = [
            { card: card({ id: 'a' }), kind: 'review' as const },
            { card: card({ id: 'b' }), kind: 'review' as const },
            { card: card({ id: 'c' }), kind: 'review' as const },
            { card: card({ id: 'd' }), kind: 'review' as const },
            { card: card({ id: 'e' }), kind: 'review' as const },
        ];
        const afterAgain = applyGrade(queue, 1);
        expect(afterAgain.map((i) => i.card.id)).toEqual([
            'b',
            'c',
            'd',
            'a',
            'e',
        ]);
        expect(afterAgain[AGAIN_REINSERT_OFFSET].kind).toBe('learning');
        expect(applyGrade(queue, 3).map((i) => i.card.id)).toEqual([
            'b',
            'c',
            'd',
            'e',
        ]);
    });

    it('finds the next future due date among reviewed cards', () => {
        const now = new Date('2026-06-01T00:00:00Z');
        expect(
            nextDueDate(
                [
                    card({ id: 'n', repetitions: 0 }),
                    card({
                        id: 'past',
                        repetitions: 1,
                        lastReviewedAt: '2026-01-01T00:00:00Z',
                        dueDate: '2026-05-01T00:00:00Z',
                    }),
                    card({
                        id: 'soon',
                        repetitions: 1,
                        lastReviewedAt: '2026-01-01T00:00:00Z',
                        dueDate: '2026-06-03T00:00:00Z',
                    }),
                    card({
                        id: 'later',
                        repetitions: 1,
                        lastReviewedAt: '2026-01-01T00:00:00Z',
                        dueDate: '2026-07-01T00:00:00Z',
                    }),
                ],
                now
            )?.toISOString()
        ).toBe('2026-06-03T00:00:00.000Z');
        expect(
            nextDueDate([card({ id: 'n', repetitions: 0 })], now)
        ).toBeNull();
    });
});
