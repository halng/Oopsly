'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, router]);

    // Always keep `children` mounted. Next.js App Router needs the page slot
    // in the tree or RSC hydration fails with enqueueModel.
    return (
        <>
            {!isAuthenticated && (
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
            <div className={isAuthenticated ? undefined : 'hidden'} aria-hidden={!isAuthenticated}>
                {children}
            </div>
        </>
    );
};

export default AuthGuard;
