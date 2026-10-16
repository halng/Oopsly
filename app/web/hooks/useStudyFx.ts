'use client';
import { useCallback } from 'react';
import { useUserProfileStore } from '@/store';
import { playStudySound, StudySound } from '@/utils/studySounds';

export function areStudySoundsEnabled(): boolean {
    const settings = useUserProfileStore.getState().profile?.settings;
    if (settings?.soundEffectsEnabled === false) return false;
    if (settings?.soundEffects === false) return false;
    return true;
}

export function useStudyFx() {
    const soundsEnabled = useUserProfileStore((s) => {
        const settings = s.profile?.settings;
        if (settings?.soundEffectsEnabled === false) return false;
        if (settings?.soundEffects === false) return false;
        return true;
    });

    const play = useCallback((kind: StudySound) => {
        if (!areStudySoundsEnabled()) return;
        playStudySound(kind);
    }, []);

    return { play, soundsEnabled };
}
