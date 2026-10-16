import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { areStudySoundsEnabled, useStudyFx } from '@/hooks/useStudyFx';
import { useUserProfileStore } from '@/store';
import { playStudySound } from '@/utils/studySounds';
import type { UserProfile } from '@/types';

vi.mock('@/utils/studySounds', () => ({
    playStudySound: vi.fn(),
}));

function profileWith(settings: UserProfile['settings']): UserProfile {
    return {
        email: 'a@b.c',
        name: 'A',
        displayName: 'A',
        streakDays: 0,
        totalCardsStudied: 0,
        totalReviews: 0,
        retentionRate: 0,
        xp: 0,
        league: '',
        settings,
    };
}

describe('useStudyFx', () => {
    const initial = useUserProfileStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        useUserProfileStore.setState(initial, true);
    });

    it('plays sounds by default when no profile is loaded', () => {
        expect(areStudySoundsEnabled()).toBe(true);
        const { result } = renderHook(() => useStudyFx());
        expect(result.current.soundsEnabled).toBe(true);
        act(() => result.current.play('correct'));
        expect(playStudySound).toHaveBeenCalledWith('correct');
    });

    it('respects soundEffectsEnabled and soundEffects flags', () => {
        useUserProfileStore
            .getState()
            .setProfile(
                profileWith({ dailyGoal: 20, soundEffectsEnabled: false })
            );
        expect(areStudySoundsEnabled()).toBe(false);
        const disabled = renderHook(() => useStudyFx());
        expect(disabled.result.current.soundsEnabled).toBe(false);
        act(() => disabled.result.current.play('tap'));
        expect(playStudySound).not.toHaveBeenCalled();

        useUserProfileStore
            .getState()
            .setProfile(profileWith({ dailyGoal: 20, soundEffects: false }));
        expect(areStudySoundsEnabled()).toBe(false);

        useUserProfileStore
            .getState()
            .setProfile(
                profileWith({ dailyGoal: 20, soundEffectsEnabled: true })
            );
        expect(areStudySoundsEnabled()).toBe(true);
        const enabled = renderHook(() => useStudyFx());
        act(() => enabled.result.current.play('flip'));
        expect(playStudySound).toHaveBeenCalledWith('flip');
    });
});
