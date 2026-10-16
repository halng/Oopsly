import { describe, expect, it } from 'vitest';
import { offlineDb } from '@/services/offlineDb';

describe('offlineDb.saveOfflineCardReview', () => {
    it('rejects reviews without shelf and subject routing context', async () => {
        await expect(
            offlineDb.saveOfflineCardReview('card-1', 4, undefined as never)
        ).rejects.toThrow(
            'Shelf and subject context are required for card reviews'
        );
    });
});
