'use client';
import React from 'react';
import {
    Sparkles,
    Flame,
    Zap,
    BookOpen,
    Compass,
    BarChart3,
    Trophy,
    Settings,
    Layers,
    WifiOff,
    RefreshCw,
    Database,
    Sprout,
    Bell,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { CalendarModal } from '@/components/shared';
import { ApiService } from '@/services/api';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfileStore } from '@/store/UserProfile';

const Navbar = () => {
    const router = useRouter();
    const pathname = usePathname() || '';
    const { isOnline, isSyncing, pendingCount, syncNow } = useSyncStatus();
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    const [reviewedToday, setReviewedToday] = React.useState(0);
    const userProfile = useUserProfileStore().profile;

    React.useEffect(() => {
        ApiService.getStats().then((res) => {
            if (res.isSuccess && res.data) {
                setReviewedToday(res.data.reviewedToday);
            }
        });
    }, [userProfile?.totalReviews]);

    const isNavActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    const navLinkClass = (href: string) =>
        `flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            isNavActive(href)
                ? 'shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
        }`;
    const navLinkStyle = (href: string) =>
        isNavActive(href)
            ? {
                  backgroundColor: 'var(--theme-subtle)',
                  color: 'var(--theme-accent)',
              }
            : undefined;

    const dailyGoal = userProfile?.settings?.dailyGoal || 20;
    const progressPercentage = Math.min((reviewedToday / dailyGoal) * 100, 100);
    const circleRadius = 8;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset =
        circleCircumference - (progressPercentage / 100) * circleCircumference;

    return (
        <>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand Logo & Name */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        <Link
                            href="/home"
                            id="brand-logo-btn"
                            data-testid="brand-logo"
                            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer focus:outline-none"
                        >
                            <div
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-all shrink-0"
                                style={{
                                    backgroundColor: 'var(--theme-accent)',
                                }}
                            >
                                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--theme-text)] flex items-center gap-1">
                                    Oopsly
                                    <span
                                        className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor:
                                                'var(--theme-subtle)',
                                            color: 'var(--theme-accent)',
                                        }}
                                    >
                                        FSRS
                                    </span>
                                </span>
                                <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-medium -mt-0.5 hidden xs:inline">
                                    Active Recall & SRS
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation Tabs */}
                    <nav
                        className="hidden md:flex items-center gap-1 ml-2 lg:ml-4"
                        aria-label="Main Navigation"
                    >
                        <Link
                            href="/study"
                            id="nav-tab-study"
                            data-testid="nav-study"
                            style={navLinkStyle('/study')}
                            className={`${navLinkClass('/study')} relative`}
                        >
                            <Sprout
                                className="w-4 h-4"
                                style={{ color: 'var(--theme-accent)' }}
                            />
                            <span>Study</span>
                        </Link>

                        <Link
                            href="/discover"
                            id="nav-tab-discover"
                            data-testid="nav-discover"
                            style={navLinkStyle('/discover')}
                            className={navLinkClass('/discover')}
                        >
                            <Compass className="w-4 h-4" />
                            <span>Discover</span>
                        </Link>

                        <Link
                            href="/leaderboard"
                            id="nav-tab-leaderboard"
                            data-testid="nav-leaderboard"
                            style={navLinkStyle('/leaderboard')}
                            className={navLinkClass('/leaderboard')}
                        >
                            <Trophy className="w-4 h-4" />
                            <span>Leaderboard</span>
                        </Link>

                        <Link
                            href="/stats"
                            id="nav-tab-stats"
                            data-testid="nav-stats"
                            style={navLinkStyle('/stats')}
                            className={navLinkClass('/stats')}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>Stats</span>
                        </Link>
                    </nav>

                    {/* Gamification Counters & Theme / User Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                        {/* Online / Offline Sync Indicator */}
                        {(!isOnline || isSyncing || pendingCount > 0) && (
                            <button
                                id="nav-sync-status-btn"
                                data-testid="btn-sync-status"
                                onClick={() => syncNow()}
                                title={
                                    !isOnline
                                        ? `Offline Mode: ${pendingCount} pending changes saved to IndexedDB`
                                        : isSyncing
                                          ? 'Syncing changes to cloud...'
                                          : pendingCount > 0
                                            ? `${pendingCount} unsynced changes. Click to sync.`
                                            : 'Online · All cards & reviews synced'
                                }
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                    !isOnline
                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                        : isSyncing
                                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                          : pendingCount > 0
                                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 animate-pulse'
                                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100/50'
                                }`}
                            >
                                {!isOnline ? (
                                    <>
                                        <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="hidden xs:inline">
                                            Offline
                                        </span>
                                        {pendingCount > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-extrabold">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </>
                                ) : isSyncing ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
                                        <span className="hidden sm:inline">
                                            Syncing...
                                        </span>
                                    </>
                                ) : pendingCount > 0 ? (
                                    <>
                                        <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="hidden sm:inline">
                                            Sync ({pendingCount})
                                        </span>
                                    </>
                                ) : null}
                            </button>
                        )}

                        {/* Streak Counter */}
                        <div
                            id="user-streak-badge"
                            data-testid="streak-badge"
                            title="Daily study streak"
                            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-xs font-bold shadow-2xs"
                        >
                            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
                            <span>{userProfile?.streakDays}d</span>
                        </div>

                        {/* Daily Goal Progress Ring */}
                        <div
                            title={`Daily Goal: ${reviewedToday} / ${dailyGoal} cards`}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border shadow-2xs"
                            style={{
                                backgroundColor: 'var(--theme-subtle)',
                                borderColor: 'var(--theme-border)',
                            }}
                        >
                            <div className="relative w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center">
                                <svg
                                    className="w-full h-full -rotate-90 transform"
                                    viewBox="0 0 20 20"
                                >
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r={circleRadius}
                                        className="fill-none stroke-current opacity-20"
                                        strokeWidth="2.5"
                                        style={{ color: 'var(--theme-accent)' }}
                                    />
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r={circleRadius}
                                        className="fill-none stroke-current transition-all duration-1000 ease-out"
                                        strokeWidth="2.5"
                                        strokeDasharray={circleCircumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        style={{ color: 'var(--theme-accent)' }}
                                    />
                                </svg>
                                {progressPercentage >= 100 && (
                                    <Sparkles className="absolute w-2 h-2 text-amber-500" />
                                )}
                            </div>
                            <span
                                className="text-xs font-bold"
                                style={{ color: 'var(--theme-accent)' }}
                            >
                                {reviewedToday}/{dailyGoal}
                            </span>
                        </div>

                        {/* Total XP */}
                        <div
                            id="user-xp-badge"
                            data-testid="xp-badge"
                            title="Total Experience Points"
                            style={{
                                backgroundColor: 'var(--theme-subtle)',
                                borderColor: 'var(--theme-border)',
                                color: 'var(--theme-accent)',
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-2xs"
                        >
                            <Zap className="w-4 h-4 fill-current shrink-0" />
                            <span>{userProfile?.xp} XP</span>
                        </div>

                        {/* Calendar Button */}
                        <button
                            title="Study Calendar"
                            onClick={() => setIsCalendarOpen(true)}
                            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-[var(--theme-border)] transition-colors cursor-pointer"
                        >
                            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Notifications Button */}
                        <button
                            title="Notifications"
                            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-[var(--theme-border)] transition-colors cursor-pointer relative"
                        >
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border-2 border-[var(--theme-card)]" />
                        </button>

                        {/* Upgrade to Pro */}
                        <button
                            onClick={() => router.push('/subscribe')}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] text-[var(--theme-secondary)] dark:text-[var(--theme-accent)] hover:bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] transition-colors text-xs font-bold cursor-pointer border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Pro</span>
                        </button>

                        {/* User Profile Avatar / Menu */}
                        <button
                            id="user-profile-btn"
                            data-testid="btn-user-profile"
                            onClick={() => router.push('/settings')}
                            style={{ borderColor: 'var(--theme-border)' }}
                            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border hover:opacity-90 transition-colors cursor-pointer"
                        >
                            <img
                                src={
                                    userProfile?.avatarUrl ||
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                                }
                                alt={userProfile?.displayName}
                                className="w-7 h-7 rounded-full object-cover border border-white dark:border-stone-700 shadow-2xs shrink-0"
                            />
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 max-w-[80px] lg:max-w-[100px] truncate hidden md:inline">
                                {userProfile?.displayName.split(' ')[0] || ''}
                            </span>
                        </button>

                        {/* Settings */}
                        <button
                            id="nav-settings-btn"
                            data-testid="btn-settings"
                            onClick={() => router.push('/settings')}
                            title="Settings"
                            className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {isCalendarOpen && (
                <CalendarModal onClose={() => setIsCalendarOpen(false)} />
            )}
        </>
    );
};

export default Navbar;
