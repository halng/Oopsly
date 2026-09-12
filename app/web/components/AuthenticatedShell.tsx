'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components';
import { syncManager } from '@/services/syncManager';
import AuthGuard from './AuthGuard';

interface AuthenticatedShellProps {
    children: React.ReactNode;
}

const SESSION_PATH_PATTERN = /\/(review|learn|match|test)(\/|$)/;

const AuthenticatedShell = ({ children }: AuthenticatedShellProps) => {
    const pathname = usePathname() || '';
    const hideNavbar = SESSION_PATH_PATTERN.test(pathname);

    useEffect(() => {
        // syncManager.init();
    }, []);

    return (
        <AuthGuard>
            <div
                id="app-root-container"
                className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] flex flex-col font-sans selection:bg-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)] transition-colors"
                style={{
                    backgroundColor: 'var(--theme-bg)',
                    color: 'var(--theme-text)',
                }}
            >
                {!hideNavbar && (
                    <header className="border-b border-stone-200/60 dark:border-stone-800/60 bg-[var(--theme-bg)]/80 backdrop-blur-md sticky top-0 z-40">
                        <Navbar />
                    </header>
                )}
                <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
                    {children}
                </main>
                {!hideNavbar && (
                    <footer className="py-6 border-t border-stone-200/60 dark:border-stone-800/60 text-center text-xs text-stone-400">
                        <p>
                            © 2026 Oopsly · Spaced Repetition Flashcards with
                            FSRS Algorithm & Collaborative Communities
                        </p>
                    </footer>
                )}
            </div>
        </AuthGuard>
    );
};

export default AuthenticatedShell;
