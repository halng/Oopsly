'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        void useAuthStore.persist.rehydrate();
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !hasHydrated || isAuthenticated) return;
        router.replace('/login');
    }, [mounted, hasHydrated, isAuthenticated, router]);

    const showApp = mounted && hasHydrated && isAuthenticated;

    // Always keep `children` mounted. Next.js App Router needs the page slot
    // in the tree or RSC hydration fails with enqueueModel.
    return (
        <>
            {!showApp && (
                <div
                    className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"
                    data-testid="auth-guard-loading"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-stone-200 border-t-[var(--theme-accent)] rounded-full animate-spin" />
                        <span className="text-stone-500 font-bold text-sm animate-pulse">
                            Loading Oopsly...
                        </span>
                    </div>
                </div>
            )}
            <div
                className={showApp ? undefined : 'hidden'}
                aria-hidden={!showApp}
            >
                {children}
            </div>
        </>
    );
};

export default AuthGuard;
