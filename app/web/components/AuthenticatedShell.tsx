'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components';
import { syncManager } from '@/services/syncManager';
import { startTokenRefreshTimer } from '@/services/tokenRefresh';
import { useFeaturesStore } from '@/store/Features';
import { useUserProfileStore } from '@/store/UserProfile';
import { ApiService } from '@/services/api';
import { THEME_OPTIONS, applyTheme, getSavedTheme } from '@/utils/theme';
import AuthGuard from './AuthGuard';

interface AuthenticatedShellProps {
    children: React.ReactNode;
}

const SESSION_PATH_PATTERN = /\/(super-review|review|learn|match|tests?)(\/|$)/;

const AuthenticatedShell = ({ children }: AuthenticatedShellProps) => {
    const pathname = usePathname() || '';
    const hideNavbar = SESSION_PATH_PATTERN.test(pathname);

    useEffect(() => {
        // syncManager.init();
    }, []);

    useEffect(() => startTokenRefreshTimer(), []);

    // The theme chosen on the account wins; until the profile arrives, use the copy this
    // browser remembers so the page does not flash the default.
    const profile = useUserProfileStore((s) => s.profile);
    const setProfile = useUserProfileStore((s) => s.setProfile);
    useEffect(() => {
        applyTheme(getSavedTheme());
    }, []);
    useEffect(() => {
        if (profile) return;
        void ApiService.getProfile().then((res) => {
            if (res.isSuccess && res.data) setProfile(res.data);
        });
    }, [profile, setProfile]);
    const savedTheme = profile?.settings?.theme;
    useEffect(() => {
        const match = THEME_OPTIONS.find((t) => t.id === savedTheme);
        if (match) applyTheme(match.id);
    }, [savedTheme]);

    const loadFeatures = useFeaturesStore((s) => s.load);
    useEffect(() => {
        loadFeatures();
    }, [loadFeatures]);

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
                            © 2026 Quizi · Spaced Repetition Flashcards with
                            FSRS Algorithm & Collaborative Communities
                        </p>
                    </footer>
                )}
            </div>
        </AuthGuard>
    );
};

export default AuthenticatedShell;
