import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '@/services/api';
import { syncManager } from '@/services/syncManager';

vi.mock('@/services/api', () => ({
    ApiService: {
        healthCheck: vi.fn(),
    },
}));

vi.mock('@/services/offlineDb', () => ({
    offlineDb: {
        getPendingSyncCount: vi.fn().mockResolvedValue(0),
        getPendingSyncActions: vi.fn().mockResolvedValue([]),
    },
}));

describe('syncManager.checkConnection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        });
    });

    it('treats a successful /v1/ping as online', async () => {
        vi.mocked(ApiService.healthCheck).mockResolvedValue({
            isSuccess: true,
            message: 'pong',
            data: null,
            timestamp: '',
        });

        await expect(syncManager.checkConnection()).resolves.toBe(true);
        expect(syncManager.getStatus().isOnline).toBe(true);
    });

    it('treats a failed ping as offline even when the browser is online', async () => {
        vi.mocked(ApiService.healthCheck).mockResolvedValue({
            isSuccess: false,
            message: 'Network error occurred',
            data: null,
            timestamp: '',
        });

        await expect(syncManager.checkConnection()).resolves.toBe(false);
        expect(syncManager.getStatus().isOnline).toBe(false);
    });
});
