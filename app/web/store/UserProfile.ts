import { create } from 'zustand';
import { UserProfile } from '@/types';

export const useUserProfileStore = create<{
    profile: UserProfile | null;
    setProfile: (profile: UserProfile) => void;
}>((set) => ({
    profile: null,
    setProfile: (profile: UserProfile) => set({ profile }),
}));