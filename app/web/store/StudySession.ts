import { create } from 'zustand';
import { Grade } from '@/types';
import { GameReward } from '@/services/gameApi';

export interface ReviewSessionStats {
    totalReviewed: number;
    xpEarned: number;
    gradeCounts: Record<Grade, number>;
    timeSpentSeconds: number;
    subjectTitle: string;
    subjectId: string;
    shelfId: string;
    pouch?: GameReward | null;
}

export const useStudySessionStore = create<{
    lastReview: ReviewSessionStats | null;
    setLastReview: (stats: ReviewSessionStats) => void;
    clearLastReview: () => void;
}>((set) => ({
    lastReview: null,
    setLastReview: (lastReview) => set({ lastReview }),
    clearLastReview: () => set({ lastReview: null }),
}));
