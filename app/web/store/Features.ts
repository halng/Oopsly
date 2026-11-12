import { create } from 'zustand';
import { ApiService } from '@/services/api';

interface FeaturesState {
    flags: Record<string, boolean>;
    plan: string | null;
    load: () => Promise<void>;
}

/**
 * Feature flags from the auth service. A flag that has not loaded (or failed to load) is
 * off, so a gated feature never shows by accident.
 */
export const useFeaturesStore = create<FeaturesState>((set) => ({
    flags: {},
    plan: null,
    load: async () => {
        const res = await ApiService.getFeatures();
        if (res.isSuccess && res.data) {
            set({
                plan: res.data.plan,
                flags: Object.fromEntries(
                    Object.entries(res.data.features).map(([key, f]) => [
                        key,
                        f.enabled,
                    ])
                ),
            });
        }
    },
}));

export const useFeature = (key: string) =>
    useFeaturesStore((s) => s.flags[key] === true);
