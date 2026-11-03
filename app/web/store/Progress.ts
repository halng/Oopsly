import { create } from 'zustand';
import { ApiService } from '@/services/api';

interface ProgressState {
    streakDays: number;
    xp: number;
    reviewedToday: number;
    refresh: () => Promise<void>;
}

/** Streak, XP and today's reviews as the API reports them for the signed-in user. */
export const useProgressStore = create<ProgressState>((set) => ({
    streakDays: 0,
    xp: 0,
    reviewedToday: 0,
    refresh: async () => {
        const res = await ApiService.getStats();
        if (res.isSuccess && res.data) {
            set({
                streakDays: res.data.streakDays ?? 0,
                xp: res.data.totalXp ?? 0,
                reviewedToday: res.data.reviewedToday ?? 0,
            });
        }
    },
}));
