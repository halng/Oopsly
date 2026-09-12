import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaderboardPage from '@/app/(app)/leaderboard/page';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: {
        getCommunities: vi.fn(),
        getMyCommunities: vi.fn(),
        getCommunityLeaderboard: vi.fn(),
        joinCommunity: vi.fn(),
        createCommunity: vi.fn(),
        inviteUserToCommunity: vi.fn(),
    },
}));
vi.mock('@/components/leaderboard/CommunityModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="community-modal" /> : null,
}));
vi.mock('@/components/leaderboard/CommunityRequestsModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="requests-modal" /> : null,
}));
vi.mock('@/components/shared', () => ({
    InviteUserModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="invite-modal" /> : null,
}));

const community = {
    id: 'c1',
    name: 'Forest Club',
    description: 'Study together',
    isPrivate: false,
    memberCount: 2,
    ownerId: 'u1',
    ownerName: 'Owner',
    userRole: 'OWNER',
    createdAt: '2026-01-01',
};

describe('LeaderboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getCommunities).mockResolvedValue({
            isSuccess: true,
            data: [community],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getMyCommunities).mockResolvedValue({
            isSuccess: true,
            data: [community],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getCommunityLeaderboard).mockResolvedValue({
            isSuccess: true,
            data: {
                community,
                members: [
                    {
                        id: 'm1',
                        communityId: 'c1',
                        userId: 'u1',
                        displayName: 'Ava',
                        role: 'OWNER',
                        xp: 100,
                        streakDays: 3,
                        cardsStudiedThisWeek: 8,
                        joinedAt: '2026-01-01',
                    },
                ],
            },
            message: '',
            timestamp: '',
        } as never);
    });

    it('loads communities and member rows', async () => {
        render(<LeaderboardPage />);
        expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('community-card-c1')).toBeInTheDocument()
        );
        await waitFor(() =>
            expect(screen.getByTestId('member-row-m1')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-create-community'));
        expect(screen.getByTestId('community-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-open-invite'));
        expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
    });
});
