import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '@/services/api';
import { syncManager } from '@/services/syncManager';

vi.mock('@/services/api', () => ({
    apiClient: {
        put: vi.fn(),
    },
    ApiService: {
        healthCheck: vi.fn(),
    },
    GRADE_LEVELS: { 1: 'AGAIN', 2: 'HARD', 3: 'GOOD', 4: 'EASY' },
}));

vi.mock('@/services/offlineDb', () => ({
    offlineDb: {
        getPendingSyncCount: vi.fn().mockResolvedValue(0),
        getPendingSyncActions: vi.fn().mockResolvedValue([]),
        updateSyncAction: vi.fn(),
        removeSyncAction: vi.fn(),
        getCachedCardById: vi.fn(),
        getCachedSubjectById: vi.fn(),
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

    it('recovers routing context for previously queued grade actions', async () => {
        const { offlineDb } = await import('@/services/offlineDb');
        const { apiClient } = await import('@/services/api');
        vi.mocked(ApiService.healthCheck).mockResolvedValue({
            isSuccess: true,
            message: 'pong',
            data: null,
            timestamp: '',
        });
        vi.mocked(offlineDb.getPendingSyncCount).mockResolvedValue(1);
        vi.mocked(offlineDb.getPendingSyncActions).mockResolvedValue([
            {
                id: 'legacy-review',
                type: 'GRADE_CARD',
                payload: { cardId: 'card-1', grade: 4 },
                createdAt: '',
                status: 'pending',
                retryCount: 0,
            },
        ]);
        vi.mocked(offlineDb.getCachedCardById).mockResolvedValue({
            id: 'card-1',
            subjectId: 'subject-1',
        } as never);
        vi.mocked(offlineDb.getCachedSubjectById).mockResolvedValue({
            id: 'subject-1',
            shelfId: 'shelf-1',
        } as never);
        vi.mocked(apiClient.put).mockResolvedValue({
            data: { isSuccess: true, data: { cards: [] } },
        } as never);

        await expect(syncManager.syncNow()).resolves.toEqual({
            success: 1,
            failed: 0,
        });
        expect(apiClient.put).toHaveBeenCalledWith(
            '/v1/shelves/shelf-1/subjects/subject-1/cards/difficulty',
            [{ cardId: 'card-1', newLevel: 'EASY' }]
        );
    });
});
