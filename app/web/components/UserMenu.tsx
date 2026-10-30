'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLogout } from '@/hooks/useLogout';
import { useUserProfileStore } from '@/store/UserProfile';
import { ApiService } from '@/services/api';

const AVATAR_FALLBACK =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

/** Avatar and first name in the top bar; opens a small account menu. */
export default function UserMenu() {
    const router = useRouter();
    const logout = useLogout();
    const profile = useUserProfileStore().profile;
    const setProfile = useUserProfileStore().setProfile;
    const [open, setOpen] = useState(false);
    const refreshed = useRef<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // Avatar links are presigned and expire; fetch a fresh one once if it fails.
    const onAvatarError = () => {
        const url = profile?.avatarUrl ?? '';
        if (!url || refreshed.current === url) return;
        refreshed.current = url;
        ApiService.getProfile().then((res) => {
            if (res.isSuccess && res.data) setProfile(res.data);
        });
    };

    const item =
        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-left cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800';

    return (
        <div ref={ref} className="relative">
            <button
                id="user-profile-btn"
                data-testid="btn-user-profile"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                style={{ borderColor: 'var(--theme-border)' }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border hover:opacity-90 transition-colors cursor-pointer"
            >
                <img
                    src={profile?.avatarUrl || AVATAR_FALLBACK}
                    alt={profile?.displayName}
                    onError={onAvatarError}
                    className="w-7 h-7 rounded-full object-cover border border-white dark:border-stone-700 shadow-2xs shrink-0"
                />
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 max-w-[80px] lg:max-w-[100px] truncate hidden md:inline">
                    {profile?.displayName.split(' ')[0] || ''}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden md:block" />
            </button>
            {open && (
                <div
                    role="menu"
                    data-testid="user-menu"
                    className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border bg-white dark:bg-stone-900 shadow-lg z-50"
                    style={{ borderColor: 'var(--theme-border)' }}
                >
                    <button
                        role="menuitem"
                        data-testid="menu-profile"
                        onClick={() => {
                            setOpen(false);
                            router.push('/settings');
                        }}
                        className={`${item} text-stone-800 dark:text-stone-200`}
                    >
                        <User className="w-4 h-4" />
                        Profile
                    </button>
                    <button
                        role="menuitem"
                        data-testid="menu-logout"
                        onClick={() => {
                            setOpen(false);
                            logout();
                        }}
                        className={`${item} text-rose-600 border-t border-stone-100 dark:border-stone-800`}
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}
