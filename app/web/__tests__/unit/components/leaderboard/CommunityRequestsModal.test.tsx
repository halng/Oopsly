import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityRequestsModal from '@/components/leaderboard/CommunityRequestsModal';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: {
        getCommunityJoinRequests: vi.fn(),
        approveJoinRequest: vi.fn(),
        rejectJoinRequest: vi.fn(),
    },
}));

const requests = [
    {
        id: 'r1',
        displayName: 'Alice',
        userEmail: 'alice@x.com',
        message: 'Let me in',
    },
    { id: 'r2', displayName: 'Bob' },
];

const setup = (props: Record<string, unknown> = {}) => {
    const onClose = vi.fn();
    const onApproveSuccess = vi.fn();
    const utils = render(
        <CommunityRequestsModal
            isOpen
            communityId="c1"
            communityName="Guild"
            onClose={onClose}
            onApproveSuccess={onApproveSuccess}
            {...props}
        />
    );
    return { onClose, onApproveSuccess, ...utils };
};

describe('CommunityRequestsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getCommunityJoinRequests).mockResolvedValue({
            isSuccess: true,
            data: requests,
        } as never);
    });

    it('renders nothing and does not fetch when closed', () => {
        setup({ isOpen: false });
        expect(screen.queryByTestId('community-requests-modal')).toBeNull();
        expect(ApiService.getCommunityJoinRequests).not.toHaveBeenCalled();
    });

    it('does not fetch without a community id', () => {
        setup({ communityId: '' });
        expect(ApiService.getCommunityJoinRequests).not.toHaveBeenCalled();
    });

    it('shows loading then the requests', async () => {
        setup();
        expect(
            screen.getByText('Loading join applications...')
        ).toBeInTheDocument();
        expect(
            await screen.findByTestId('request-item-r1')
        ).toBeInTheDocument();
        expect(ApiService.getCommunityJoinRequests).toHaveBeenCalledWith('c1');
        expect(
            screen.getByText('Pending applicants for Guild')
        ).toBeInTheDocument();
        expect(screen.getByText('alice@x.com')).toBeInTheDocument();
        expect(screen.getByText('Let me in')).toBeInTheDocument();
        expect(screen.getByTestId('request-item-r2')).toHaveTextContent('Bob');
        expect(screen.getByTestId('request-item-r2')).not.toHaveTextContent(
            '@'
        );
    });

    it('shows the empty state when there are no requests', async () => {
        vi.mocked(ApiService.getCommunityJoinRequests).mockResolvedValue({
            isSuccess: true,
            data: [],
        } as never);
        setup();
        expect(
            await screen.findByText('No pending applications')
        ).toBeInTheDocument();
    });

    it('shows the empty state when the fetch is unsuccessful', async () => {
        vi.mocked(ApiService.getCommunityJoinRequests).mockResolvedValue({
            isSuccess: false,
        } as never);
        setup();
        expect(
            await screen.findByText('No pending applications')
        ).toBeInTheDocument();
    });

    it('approves a request, removes it and notifies the parent', async () => {
        vi.mocked(ApiService.approveJoinRequest).mockResolvedValue({
            isSuccess: true,
        } as never);
        const { onApproveSuccess } = setup();
        await userEvent.click(await screen.findByTestId('btn-approve-r1'));
        await waitFor(() =>
            expect(screen.queryByTestId('request-item-r1')).toBeNull()
        );
        expect(ApiService.approveJoinRequest).toHaveBeenCalledWith('c1', 'r1');
        expect(onApproveSuccess).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('request-item-r2')).toBeInTheDocument();
    });

    it('keeps the request when approval fails', async () => {
        vi.mocked(ApiService.approveJoinRequest).mockResolvedValue({
            isSuccess: false,
        } as never);
        const { onApproveSuccess } = setup();
        await userEvent.click(await screen.findByTestId('btn-approve-r1'));
        await waitFor(() =>
            expect(screen.getByTestId('btn-approve-r1')).toBeEnabled()
        );
        expect(screen.getByTestId('request-item-r1')).toBeInTheDocument();
        expect(onApproveSuccess).not.toHaveBeenCalled();
    });

    it('disables the buttons of the request being processed', async () => {
        let resolve!: (v: unknown) => void;
        vi.mocked(ApiService.rejectJoinRequest).mockReturnValue(
            new Promise((r) => (resolve = r)) as never
        );
        setup();
        await userEvent.click(await screen.findByTestId('btn-reject-r1'));
        expect(screen.getByTestId('btn-reject-r1')).toBeDisabled();
        expect(screen.getByTestId('btn-approve-r1')).toBeDisabled();
        expect(screen.getByTestId('btn-approve-r2')).toBeEnabled();
        resolve({ isSuccess: true });
        await waitFor(() =>
            expect(screen.queryByTestId('request-item-r1')).toBeNull()
        );
    });

    it('rejects a request without notifying approval', async () => {
        vi.mocked(ApiService.rejectJoinRequest).mockResolvedValue({
            isSuccess: true,
        } as never);
        const { onApproveSuccess } = setup();
        await userEvent.click(await screen.findByTestId('btn-reject-r2'));
        await waitFor(() =>
            expect(screen.queryByTestId('request-item-r2')).toBeNull()
        );
        expect(ApiService.rejectJoinRequest).toHaveBeenCalledWith('c1', 'r2');
        expect(onApproveSuccess).not.toHaveBeenCalled();
    });

    it('keeps the request when rejection fails', async () => {
        vi.mocked(ApiService.rejectJoinRequest).mockResolvedValue({
            isSuccess: false,
        } as never);
        setup();
        await userEvent.click(await screen.findByTestId('btn-reject-r1'));
        await waitFor(() =>
            expect(screen.getByTestId('btn-reject-r1')).toBeEnabled()
        );
        expect(screen.getByTestId('request-item-r1')).toBeInTheDocument();
    });

    it('closes via X and backdrop but not from inside', async () => {
        const { onClose } = setup();
        await screen.findByTestId('request-item-r1');
        await userEvent.click(screen.getByTestId('community-requests-modal'));
        expect(onClose).not.toHaveBeenCalled();
        await userEvent.click(screen.getByTestId('btn-requests-close'));
        await userEvent.click(
            screen.getByTestId('community-requests-modal').parentElement!
        );
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('ignores a response that arrives after unmount', async () => {
        let resolve!: (v: unknown) => void;
        vi.mocked(ApiService.getCommunityJoinRequests).mockReturnValue(
            new Promise((r) => (resolve = r)) as never
        );
        const { unmount } = setup();
        unmount();
        resolve({ isSuccess: true, data: requests });
        await Promise.resolve();
        expect(screen.queryByTestId('request-item-r1')).toBeNull();
    });
});
