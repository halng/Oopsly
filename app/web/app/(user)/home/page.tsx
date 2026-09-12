'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Folder,
    Plus,
    Search,
    Clock,
    ChevronRight,
    MoreVertical,
    Edit2,
    CheckCircle2,
    Target,
    Gamepad2,
    Trash2,
    Gift,
    Film,
    Music,
    Camera,
    Bookmark,
    Heart,
    Tag,
    Star,
    Book,
} from 'lucide-react';
import { Shelf, Subject } from '@/types';
import { ApiService } from '@/services/api';
import { syncManager } from '@/services/syncManager';
import {
    ShelfModal,
    SubjectModal,
    ImportCardsModal,
    CloneSubjectModal,
    JoinGameModal,
} from '@/components/shared';
import { OfflineSyncBanner, WelcomeTourModal } from '@/components';
import SubjectCard from '@/components/home/SubjectCard';
import { useRouter } from 'next/navigation';
import { useUserProfileStore, useShelfStore } from '@/store';

const MAX_ITEMS_PER_PAGE = 50;

const PRESET_ICONS = {
    'folder': <Folder className="w-5 h-5" />,
    'book': <Book className="w-5 h-5" />,
    'star': <Star className="w-5 h-5" />,
    'tag': <Tag className="w-5 h-5" />,
    'heart': <Heart className="w-5 h-5" />,
    'bookmark': <Bookmark className="w-5 h-5" />,
    'camera': <Camera className="w-5 h-5" />,
    'music': <Music className="w-5 h-5" />,
    'film': <Film className="w-5 h-5" />,
    'gift': <Gift className="w-5 h-5" />,
};

export const HomePage: React.FC = () => {
    const router = useRouter();
    // TODO: will handle next page later
    const [currentPage, setCurrentPage] = useState<number>(1);
    const profile = useUserProfileStore((state) => state.profile);
    const setProfile = useUserProfileStore((state) => state.setProfile);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shelfSearchQuery, setShelfSearchQuery] = useState('');
    const [globalSubjectSearchQuery, setGlobalSubjectSearchQuery] =
        useState('');
    const [reviewedToday, setReviewedToday] = React.useState(0);
    const [isEditingGoal, setIsEditingGoal] = React.useState(false);
    const [tempGoal, setTempGoal] = React.useState(
        profile?.settings?.dailyGoal || 20
    );
    const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
    const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
    const [isJoinGameOpen, setIsJoinGameOpen] = useState(false);

    const [totalDue, setTotalDue] = useState(1);

    const loadUserData = useCallback(async () => {
        const profileRes = await ApiService.getProfile();
        if (profileRes.isSuccess && profileRes.data) {
            setProfile(profileRes.data);
            setTempGoal(profileRes.data.settings?.dailyGoal || 20);
        }
    }, [setProfile]);

    const loadShelvesAndSubjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const shelvesRes = await ApiService.getShelves(currentPage, MAX_ITEMS_PER_PAGE);
            if (shelvesRes.isSuccess && shelvesRes.data) {
                const fetchedShelves = shelvesRes.data.entities;
                if (fetchedShelves && fetchedShelves.length > 0) {
                    setShelves(fetchedShelves);
                    useShelfStore.getState().setShelves(fetchedShelves);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        syncManager.init();
        loadUserData();
        loadShelvesAndSubjects();
    }, [loadUserData, loadShelvesAndSubjects]);

    useEffect(() => {
        ApiService.getStats().then((res) => {
            if (res.isSuccess && res.data) {
                setReviewedToday(res.data.reviewedToday);
            }
        });
    }, [profile?.totalReviews]);

    const handleSaveGoal = async () => {
        try {
            const newGoal = Math.max(1, tempGoal);
            const res = await ApiService.updateSettings({ dailyGoal: newGoal });
            if (res.isSuccess && profile) {
                setProfile({
                    ...profile,
                    settings: { ...profile.settings, dailyGoal: newGoal },
                });
                setIsEditingGoal(false);
            }
        } catch (err) {
            console.error('Failed to save goal', err);
        }
    };

    const handleSaveShelf = async (data: {
        name: string;
        description: string;
        color: string;
        icon: string;
    }) => {
        if (editingShelf) {
            await ApiService.updateShelf(editingShelf.id, data);
        } else {
            ApiService.createShelf(data).then((res) => {
                if (res.isSuccess) {
                    alert('Shelf created successfully');
                    loadShelvesAndSubjects();
                }
            })
        }

    };

    const handleUpdateNewCommer = async () => {
        if (profile) {
            await ApiService.updateNewComer();
            loadUserData();
        }
    };


    const filteredShelves = useMemo(() => {
        return shelves.filter((s) => {
            const matches =
                s.name.toLowerCase().includes(shelfSearchQuery.toLowerCase()) ||
                (s.description || '')
                    .toLowerCase()
                    .includes(shelfSearchQuery.toLowerCase());
            setTotalDue((prevTotal) => prevTotal + (matches ? s?.stats?.totalDue : 0));
            return matches;
        });
    }, [shelves, shelfSearchQuery]);


    const renderStudyGoalTracker = () => {
        const dailyGoal = profile?.settings?.dailyGoal || 20;
        const progress = Math.min((reviewedToday / dailyGoal) * 100, 100);

        return (
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 mb-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div
                    className="absolute inset-0 bg-[color-mix(in_srgb,var(--theme-accent)_5%,transparent)] dark:bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] pointer-events-none transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                            Daily Study Goal
                        </h2>
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            {reviewedToday} of {dailyGoal} cards reviewed today
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                    <div className="flex-1 md:w-48 h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--theme-accent)] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-stone-700 dark:text-stone-300 min-w-[3ch] text-right shrink-0">
                        {Math.round(progress)}%
                    </span>
                    <button
                        onClick={() => setIsEditingGoal(true)}
                        className="ml-2 p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer shrink-0"
                        title="Edit Daily Goal"
                    >
                        <Edit2 className="w-4 h-4 text-stone-500" />
                    </button>
                </div>
                {isEditingGoal && (
                    <div className="absolute inset-0 bg-white dark:bg-stone-900 z-20 flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                                Set Daily Target:
                            </span>
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={tempGoal}
                                onChange={(e) =>
                                    setTempGoal(parseInt(e.target.value) || 20)
                                }
                                className="w-20 p-2 text-center bg-stone-100 dark:bg-stone-800 rounded-xl font-bold border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsEditingGoal(false);
                                    setTempGoal(
                                        profile?.settings?.dailyGoal || 20
                                    );
                                }}
                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveGoal}
                                className="px-4 py-2 text-sm font-bold text-white bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] rounded-xl shadow-xs cursor-pointer"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-stone-200 border-t-[var(--theme-accent)] rounded-full animate-spin"></div>
                    <span className="text-stone-500 font-bold text-sm animate-pulse">
                        Loading Oopsly...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                id="library-all-shelves-view"
                className="space-y-6 animate-fade-in"
            >
                {renderStudyGoalTracker()}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2.5">
                            <Folder className="w-6 h-6 text-[var(--theme-secondary)] dark:text-[var(--theme-accent)]" />
                            <span>My Library Shelves</span>
                        </h1>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                            Organize your knowledge hierarchy: Shelves →
                            Subjects → Cards & Tests.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            data-testid="btn-join-game"
                            onClick={() => setIsJoinGameOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-xs cursor-pointer"
                        >
                            <Gamepad2 className="w-4 h-4" />
                            <span>Join Game</span>
                        </button>
                        <button
                            data-testid="btn-create-shelf"
                            onClick={() => {
                                setEditingShelf(null);
                                setIsShelfModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Shelf</span>
                        </button>
                    </div>
                </div>

                {totalDue > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_40%,transparent)] rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {totalDue} Total Cards Due for Daily
                            FSRS Review
                        </h3>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            data-testid="search-shelves-input"
                            type="text"
                            placeholder="Search shelves..."
                            value={shelfSearchQuery}
                            onChange={(e) =>
                                setShelfSearchQuery(e.target.value)
                            }
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                    </div>
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search all subjects by title or tag..."
                            value={globalSubjectSearchQuery}
                            onChange={(e) =>
                                setGlobalSubjectSearchQuery(e.target.value)
                            }
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                    </div>
                </div>

                {filteredShelves.length === 0 ? (
                    <div
                        id="empty-shelves-state"
                        className="bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center flex flex-col items-center justify-center space-y-4"
                    >
                        <Folder className="w-7 h-7 text-stone-400" />
                        <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                            No shelves found
                        </h3>
                        <button
                            onClick={() => {
                                setEditingShelf(null);
                                setIsShelfModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create New Shelf</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredShelves.map((shelf) => {
                            return (
                                <div
                                    key={shelf.id}
                                    id={`shelf-card-${shelf.id}`}
                                    data-testid={`shelf-card-${shelf.id}`}
                                    className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer"
                                    onClick={() =>
                                        router.push(`/home/${shelf.slug}`)
                                    }
                                >
                                    <div
                                        className="h-2 w-full"
                                        style={{
                                            backgroundColor:
                                                shelf.color ||
                                                'var(--theme-accent)',
                                        }}
                                    />
                                    <div className="p-6 pb-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xs font-bold text-lg shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            shelf.color ||
                                                            'var(--theme-accent)',
                                                    }}
                                                >
                                                    {Object.fromEntries(Object.entries(PRESET_ICONS).filter(([key]) => key === shelf.icon))[shelf.icon] ?? <Folder className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                                                        {shelf.name}
                                                    </h3>
                                                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                                                        {shelf?.stats.totalSubjects}{' '}
                                                        {shelf?.stats.totalSubjects ===
                                                            1
                                                            ? 'subject'
                                                            : 'subjects'}{' '}
                                                        • {shelf?.stats?.totalCards}{' '}
                                                        cards
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className="relative"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <button
                                                    data-testid={`btn-shelf-menu-${shelf.id}`}
                                                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                
                                            </div>
                                        </div>
                                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-4 min-h-[32px]">
                                            {shelf.description ||
                                                'No description provided.'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
                                            {shelf.stats.totalDue > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                                                    {shelf?.stats?.totalDue} cards
                                                    due
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Ready to study
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-6 py-3.5 bg-stone-50/80 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800">
                                        <span
                                            data-testid={`btn-view-shelf-${shelf.id}`}
                                            className="text-xs font-bold text-[var(--theme-secondary)] flex items-center gap-1"
                                        >
                                            View shelf
                                            <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isShelfModalOpen && (
                <ShelfModal
                    shelf={editingShelf}
                    onClose={() => {
                        setIsShelfModalOpen(false);
                        setEditingShelf(null);
                    }}
                    onSave={handleSaveShelf}
                />
            )}

            {isJoinGameOpen && (
                <JoinGameModal onClose={() => setIsJoinGameOpen(false)} />
            )}

            <OfflineSyncBanner
                onDataSynced={() => {
                    loadUserData();
                    loadShelvesAndSubjects();
                }}
            />

            {profile?.settings?.isNewComer && (
                <WelcomeTourModal onClose={handleUpdateNewCommer} />
            )}
        </>
    );
};

export default HomePage;
