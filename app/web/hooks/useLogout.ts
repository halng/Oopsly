'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUserProfileStore } from '@/store';

export function useLogout() {
    const router = useRouter();

    return useCallback(() => {
        useAuthStore.getState().clearAuth();
        useUserProfileStore.getState().clearProfile();
        router.push('/');
    }, [router]);
}
