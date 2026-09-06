import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { syncManager } from '@/services/syncManager';

vi.mock('@/services/syncManager', () => ({
    syncManager: {
        getStatus: vi.fn(() => ({
            isOnline: true,
            isSyncing: false,
            pendingCount: 0,
            lastSyncTime: null,
            lastError: null,
        })),
        subscribe: vi.fn((listener: (status: unknown) => void) => {
            listener({
                isOnline: true,
                isSyncing: true,
                pendingCount: 1,
                lastSyncTime: null,
                lastError: null,
            });
            return vi.fn();
        }),
        syncNow: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
    },
}));

describe('useSyncStatus', () => {
    it('subscribes, exposes updates, delegates sync, and unsubscribes', async () => {
        const { result, unmount } = renderHook(() => useSyncStatus());
        expect(result.current.isSyncing).toBe(true);
        expect(result.current.pendingCount).toBe(1);
        await act(async () =>
            expect(result.current.syncNow()).resolves.toEqual({
                success: 1,
                failed: 0,
            })
        );
        const unsubscribe = vi.mocked(syncManager.subscribe).mock.results[0]
            ?.value as ReturnType<typeof vi.fn>;
        unmount();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
