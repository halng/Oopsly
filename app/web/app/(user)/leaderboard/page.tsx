'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Lock, Plus, Search, Trophy, Users } from 'lucide-react';
import { Community, CommunityMember } from '@/types';
import { ApiService } from '@/services/api';
import { useUserProfileStore } from '@/store';
import CommunityModal from '@/components/leaderboard/CommunityModal';
import CommunityRequestsModal from '@/components/leaderboard/CommunityRequestsModal';
import { InviteUserModal } from '@/components/shared';

export default function LeaderboardPage() {
    const currentUser = useUserProfileStore((s) => s.profile);
    const [allCommunities, setAllCommunities] = useState<Community[]>([]);
    const [myCommunities, setMyCommunities] = useState<Community[]>([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
        null
    );
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const [sortBy, setSortBy] = useState<'xp' | 'streak' | 'weekly'>('xp');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

    const loadCommunities = async () => {
        setIsLoading(true);
        const [allRes, myRes] = await Promise.all([
            ApiService.getCommunities(),
            ApiService.getMyCommunities(),
        ]);
        if (allRes.isSuccess && allRes.data) setAllCommunities(allRes.data);
        if (myRes.isSuccess && myRes.data) {
            setMyCommunities(myRes.data);
            if (myRes.data.length > 0) {
                setSelectedCommunityId((prev) => prev || myRes.data[0].id);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadCommunities();
    }, []);

    useEffect(() => {
        if (!selectedCommunityId) return;
        ApiService.getCommunityLeaderboard(selectedCommunityId).then((res) => {
            if (res.isSuccess && res.data) {
                setMembers(res.data.members || []);
            }
        });
    }, [selectedCommunityId]);

    const activeCommunity = useMemo(
        () =>
            myCommunities.find((c) => c.id === selectedCommunityId) ||
            allCommunities.find((c) => c.id === selectedCommunityId) ||
            null,
        [selectedCommunityId, myCommunities, allCommunities]
    );
    const isOwnerOrAdmin =
        activeCommunity?.userRole === 'OWNER' ||
        activeCommunity?.userRole === 'ADMIN';
    const sortedMembers = useMemo(() => {
        const list = [...members];
        if (sortBy === 'xp') list.sort((a, b) => b.xp - a.xp);
        if (sortBy === 'streak') list.sort((a, b) => b.streakDays - a.streakDays);
        if (sortBy === 'weekly')
            list.sort((a, b) => b.cardsStudiedThisWeek - a.cardsStudiedThisWeek);
        return list.map((m, idx) => ({ ...m, rank: idx + 1 }));
    }, [members, sortBy]);

    if (isLoading) {
        return (
            <div
                data-testid="leaderboard-loading"
                className="py-24 text-center text-xs"
            >
                Loading communities...
            </div>
        );
    }

    return (
        <div data-testid="leaderboard-page" className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-[var(--theme-accent)]" />
                        Community Leaderboards
                    </h1>
                    {currentUser?.displayName && (
                        <p className="text-xs text-stone-500 mt-1">
                            Signed in as {currentUser.displayName}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    data-testid="btn-create-community"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Create Community
                </button>
            </div>

            {myCommunities.length === 0 && (
                <div className="bg-stone-900 text-white rounded-3xl p-7 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-extrabold uppercase">
                        <Users className="w-3.5 h-3.5" />
                        Join a community
                    </div>
                    <h2 className="text-2xl font-extrabold">
                        Leaderboards live inside study communities
                    </h2>
                    <p className="text-sm text-stone-300">
                        Create or join a community to start ranking on XP and
                        streaks.
                    </p>
                </div>
            )}

            <div className="relative max-w-xs">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    data-testid="input-community-search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search communities..."
                    className="w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCommunities
                    .filter(
                        (c) =>
                            c.name
                                .toLowerCase()
                                .includes(searchFilter.toLowerCase()) ||
                            (c.description || '')
                                .toLowerCase()
                                .includes(searchFilter.toLowerCase())
                    )
                    .map((comm) => (
                        <div
                            key={comm.id}
                            data-testid={`community-card-${comm.id}`}
                            className="bg-white dark:bg-stone-900 rounded-2xl p-5 border space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold">{comm.name}</h3>
                                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                                        {comm.isPrivate ? (
                                            <Lock className="w-3 h-3" />
                                        ) : (
                                            <Globe className="w-3 h-3" />
                                        )}
                                        {comm.memberCount} members
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    data-testid={`btn-select-community-${comm.id}`}
                                    onClick={() =>
                                        setSelectedCommunityId(comm.id)
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                                >
                                    View
                                </button>
                            </div>
                            <p className="text-xs text-stone-500 line-clamp-2">
                                {comm.description}
                            </p>
                            {!myCommunities.some((c) => c.id === comm.id) && (
                                <button
                                    type="button"
                                    data-testid={`btn-join-${comm.id}`}
                                    onClick={async () => {
                                        await ApiService.joinCommunity(comm.id);
                                        loadCommunities();
                                    }}
                                    className="text-xs font-bold text-[var(--theme-secondary)] cursor-pointer"
                                >
                                    Join
                                </button>
                            )}
                        </div>
                    ))}
            </div>

            {activeCommunity && (
                <div className="bg-white dark:bg-stone-900 rounded-2xl border p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="font-bold">{activeCommunity.name}</h2>
                        <div className="flex gap-2">
                            {(['xp', 'streak', 'weekly'] as const).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    data-testid={`btn-sort-${key}`}
                                    onClick={() => setSortBy(key)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                        sortBy === key
                                            ? 'bg-stone-900 text-white'
                                            : 'bg-stone-100'
                                    }`}
                                >
                                    {key}
                                </button>
                            ))}
                            {isOwnerOrAdmin && (
                                <>
                                    <button
                                        type="button"
                                        data-testid="btn-open-invite"
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="px-3 py-1 rounded-lg bg-stone-100 text-xs font-bold cursor-pointer"
                                    >
                                        Invite
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="btn-open-requests"
                                        onClick={() =>
                                            setIsRequestsModalOpen(true)
                                        }
                                        className="px-3 py-1 rounded-lg bg-stone-100 text-xs font-bold cursor-pointer"
                                    >
                                        Requests
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    {sortedMembers.length === 0 ? (
                        <p className="text-xs text-stone-400">No members yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {sortedMembers.map((m) => (
                                <div
                                    key={m.id}
                                    data-testid={`member-row-${m.id}`}
                                    className="flex items-center justify-between text-sm p-3 rounded-xl bg-stone-50"
                                >
                                    <span className="font-bold">
                                        #{m.rank} {m.displayName}
                                    </span>
                                    <span className="text-xs text-stone-500">
                                        {m.xp} XP · {m.streakDays} streak
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <CommunityModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (data) => {
                    await ApiService.createCommunity(data);
                    await loadCommunities();
                }}
            />
            <InviteUserModal
                isOpen={isInviteModalOpen}
                communityName={activeCommunity?.name || ''}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={async (emailOrName) => {
                    if (!selectedCommunityId) return;
                    await ApiService.inviteUserToCommunity(
                        selectedCommunityId,
                        emailOrName
                    );
                }}
            />
            {selectedCommunityId && (
                <CommunityRequestsModal
                    isOpen={isRequestsModalOpen}
                    communityId={selectedCommunityId}
                    communityName={activeCommunity?.name || ''}
                    onClose={() => setIsRequestsModalOpen(false)}
                    onApproveSuccess={loadCommunities}
                />
            )}
        </div>
    );
}
