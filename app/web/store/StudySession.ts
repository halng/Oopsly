import { create } from 'zustand';
import { Grade } from '@/types';

export interface ReviewSessionStats {
    totalReviewed: number;
    xpEarned: number;
    gradeCounts: Record<Grade, number>;
    timeSpentSeconds: number;
    subjectTitle: string;
    subjectId: string;
    shelfId: string;
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
