import { describe, expect, it } from 'vitest';
import { CardRes, isNewCard, mapCardList, mapCardRes } from '@/utils/cardMapper';
import { card } from '@/__tests__/unit/helpers/studyFixtures';

const res: CardRes = {
    id: 'c1',
    front: 'Q',
    back: 'A',
    hint: 'think',
    nextPracticeTime: '2026-02-01T00:00:00Z',
    fsrsStability: 4.2,
    fsrsDifficulty: 6.1,
    fsrsIntervalDays: 3,
    fsrsRepetitions: 2,
    lastReviewedAt: '2026-01-29T00:00:00Z',
};

describe('cardMapper', () => {
    it('maps backend CardRes fields onto the web Card type', () => {
        const mapped = mapCardRes(res, 'sub1');
        expect(mapped).toMatchObject({
            id: 'c1',
            subjectId: 'sub1',
            front: 'Q',
            back: 'A',
            hint: 'think',
            difficulty: 6.1,
            stability: 4.2,
            intervalDays: 3,
            repetitions: 2,
            dueDate: '2026-02-01T00:00:00Z',
            lastReviewedAt: '2026-01-29T00:00:00Z',
            isDeleted: false,
            tags: [],
        });
    });

    it('passes through an already-mapped Card', () => {
        const existing = card({ id: 'c2', subjectId: 'other', front: 'Keep' });
        expect(mapCardRes(existing, 'sub1').subjectId).toBe('other');
        expect(mapCardRes(existing, 'sub1').front).toBe('Keep');
    });

    it('maps a list and treats never-reviewed cards as new', () => {
        const list = mapCardList([res, { ...res, id: 'c9', fsrsRepetitions: 0, lastReviewedAt: null }], 'sub1');
        expect(list).toHaveLength(2);
        expect(isNewCard(list[0])).toBe(false);
        expect(isNewCard(list[1])).toBe(true);
        expect(isNewCard(card({ id: 'n1', repetitions: 0 }))).toBe(true);
    });
});
