import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

const syncNow = vi.fn();
const status = {
    isOnline: false,
    isSyncing: false,
    pendingCount: 2,
    lastSyncTime: null,
    lastError: 'Retry later',
    syncNow,
};
vi.mock('@/hooks/useSyncStatus', () => ({ useSyncStatus: () => status }));

describe('OfflineSyncBanner', () => {
    it('renders offline status, errors, and delegates actions', () => {
        const { container } = render(<OfflineSyncBanner />);
        expect(screen.getByText('Offline Mode')).toBeInTheDocument();
        expect(screen.getByText('2 items')).toBeInTheDocument();
        expect(screen.getByText('Retry later')).toBeInTheDocument();
        expect(container).toMatchSnapshot();
        fireEvent.click(screen.getByTestId('btn-sync-now'));
        expect(syncNow).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByTitle('Dismiss'));
        expect(screen.queryByText('Offline Mode')).not.toBeInTheDocument();
    });

    it('returns nothing when online with no pending work', () => {
        status.isOnline = true;
        status.pendingCount = 0;
        const { container } = render(<OfflineSyncBanner />);
        expect(container).toBeEmptyDOMElement();
        status.isOnline = false;
        status.pendingCount = 2;
    });

    it('shows a success toast for a sync event and calls the callback', async () => {
        const onDataSynced = vi.fn();
        render(<OfflineSyncBanner onDataSynced={onDataSynced} />);
        window.dispatchEvent(
            new CustomEvent('oopsly-sync-completed', {
                detail: { successCount: 1 },
            })
        );
        await waitFor(() =>
            expect(screen.getByText('Sync Completed!')).toBeInTheDocument()
        );
        expect(screen.getByText(/1 change successfully/)).toBeInTheDocument();
        expect(onDataSynced).toHaveBeenCalledOnce();
    });
});
