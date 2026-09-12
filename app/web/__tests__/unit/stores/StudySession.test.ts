import { beforeEach, describe, expect, it } from 'vitest';
import { useStudySessionStore } from '@/store';

describe('useStudySessionStore', () => {
    const initial = useStudySessionStore.getState();

    beforeEach(() => {
        useStudySessionStore.setState(initial, true);
    });

    it('stores and clears last review stats', () => {
        expect(useStudySessionStore.getState().lastReview).toBeNull();
        useStudySessionStore.getState().setLastReview({
            totalReviewed: 2,
            xpEarned: 20,
            gradeCounts: { 1: 0, 2: 0, 3: 1, 4: 1 },
            timeSpentSeconds: 30,
            subjectTitle: 'Bio',
            subjectId: 'sub1',
            shelfId: 's1',
        });
        expect(useStudySessionStore.getState().lastReview?.xpEarned).toBe(20);
        useStudySessionStore.getState().clearLastReview();
        expect(useStudySessionStore.getState().lastReview).toBeNull();
    });
});
