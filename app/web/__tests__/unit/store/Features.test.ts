import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeaturesStore } from '@/store/Features';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({ ApiService: { getFeatures: vi.fn() } }));

describe('useFeaturesStore', () => {
    beforeEach(() => useFeaturesStore.setState({ flags: {}, plan: null }));

    it('keeps every flag off until the flags load', () => {
        expect(
            useFeaturesStore.getState().flags['ai.generate']
        ).toBeUndefined();
    });

    it('stays off when loading fails', async () => {
        vi.mocked(ApiService.getFeatures).mockResolvedValue({
            isSuccess: false,
            data: null,
        } as never);
        await useFeaturesStore.getState().load();
        expect(useFeaturesStore.getState().flags).toEqual({});
    });

    it('stores the enabled state of each flag', async () => {
        vi.mocked(ApiService.getFeatures).mockResolvedValue({
            isSuccess: true,
            data: {
                plan: 'FREE',
                features: {
                    'ai.generate': { enabled: false, source: 'common' },
                    'quiz.play': { enabled: true, source: 'common' },
                },
            },
        } as never);
        await useFeaturesStore.getState().load();
        expect(useFeaturesStore.getState().flags).toEqual({
            'ai.generate': false,
            'quiz.play': true,
        });
        expect(useFeaturesStore.getState().plan).toBe('FREE');
    });
});
