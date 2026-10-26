import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ request: vi.fn(), interceptor: null as any }));

vi.mock('axios', async (orig) => {
    const actual = await orig<typeof import('axios')>();
    return {
        ...actual,
        default: {
            ...actual.default,
            create: vi.fn(() => ({
                request: h.request,
                interceptors: {
                    request: {
                        use: (fn: unknown) => {
                            h.interceptor = fn;
                        },
                    },
                },
            })),
        },
    };
});

import { useAuthStore } from '@/store';
import {
    GameService,
    normalizeGarden,
    normalizeReward,
} from '@/services/gameApi';

const rawGarden: any = {
    seedInventory: { SKY_BONSAI: 3, cherry_blossom: 1 },
    plantedTrees: [
        { id: '1', species: 'GOLDEN_GINKGO', stage: 'ANCIENT' },
        { id: '2', species: 'mystery', stage: 'weird' },
    ],
};

const ok = (data: unknown) => ({
    data: { isSuccess: true, statusCode: 200, message: 'ok', data },
});

describe('gameApi', () => {
    beforeEach(() => {
        h.request.mockReset();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('request interceptor sets auth and platform headers', () => {
        useAuthStore.setState({ accessToken: 'abc' } as never);
        const cfg = h.interceptor({ headers: {} });
        expect(cfg.headers.Authorization).toBe('Bearer abc');
        expect(cfg.headers['X-Platform']).toBe('WEB');
        expect(cfg.headers['X-Request-ID']).toBeTruthy();
        useAuthStore.setState({ accessToken: '' } as never);
        const cfg2 = h.interceptor({ headers: {} });
        expect(cfg2.headers.Authorization).toBeUndefined();
    });

    it('normalizeGarden maps inventory, species, stage and weather', () => {
        const g = normalizeGarden(rawGarden);
        expect(g.seedInventory.sky_bonsai).toBe(3);
        expect(g.seedInventory.cherry_blossom).toBe(1);
        expect(g.seedInventory.camphor_tree).toBe(0);
        expect(g.plantedTrees[0]).toMatchObject({
            species: 'golden_ginkgo',
            stage: 'ancient',
        });
        expect(g.plantedTrees[1]).toMatchObject({
            species: 'wildflower_meadow',
            stage: 'seed',
        });
        expect(g.activeWeather).toBe('sunny');
        const g2 = normalizeGarden({
            activeWeather: 'rain',
            seedInventory: undefined,
        } as any);
        expect(g2.activeWeather).toBe('rain');
        expect(g2.plantedTrees).toEqual([]);
        expect(g2.seedInventory.spirit_lotus).toBe(0);
    });

    it('normalizeReward normalizes species and garden', () => {
        const r = normalizeReward({
            species: 'CITRUS_GROVE',
            garden: rawGarden,
        } as any);
        expect(r.species).toBe('citrus_grove');
        expect(r.garden.seedInventory.sky_bonsai).toBe(3);
    });

    const gardenCalls: [string, () => Promise<any>, string, string, unknown][] =
        [
            [
                'getGarden',
                () => GameService.getGarden(),
                'GET',
                '/v1/game/garden',
                undefined,
            ],
            [
                'plant',
                () => GameService.plant('sky_bonsai', 2, 'Nick'),
                'POST',
                '/v1/game/plants',
                { species: 'sky_bonsai', plotIndex: 2, nickname: 'Nick' },
            ],
            [
                'water',
                () => GameService.water('t1'),
                'POST',
                '/v1/game/plants/water',
                { treeId: 't1' },
            ],
            [
                'unlock',
                () => GameService.unlock(4),
                'POST',
                '/v1/game/plots/unlock',
                { plotIndex: 4 },
            ],
        ];

    it.each(gardenCalls)(
        '%s success normalizes garden',
        async (_n, fn, method, url, body) => {
            h.request.mockResolvedValue(ok(rawGarden));
            const res = await fn();
            expect(h.request).toHaveBeenCalledWith({ url, method, data: body });
            expect(res.data.seedInventory.sky_bonsai).toBe(3);
        }
    );

    it.each(gardenCalls)('%s failure passes through', async (_n, fn) => {
        h.request.mockResolvedValue({
            data: { isSuccess: false, message: 'nope', data: null },
        });
        const res = await fn();
        expect(res.isSuccess).toBe(false);
        expect(res.data).toBeNull();
    });

    const rewardCalls: [string, () => Promise<any>, string, unknown][] = [
        [
            'harvest',
            () => GameService.harvest('t1'),
            '/v1/game/plants/harvest',
            { treeId: 't1' },
        ],
        [
            'claimFocus',
            () => GameService.claimFocus(25),
            '/v1/game/rewards/focus',
            { focusMinutes: 25 },
        ],
        [
            'claimReview',
            () =>
                GameService.claimReview({
                    cardsReviewed: 4,
                    again: 1,
                    hard: 1,
                    good: 1,
                    easy: 1,
                }),
            '/v1/game/rewards/review',
            { cardsReviewed: 4, again: 1, hard: 1, good: 1, easy: 1 },
        ],
        [
            'claimTest',
            () => GameService.claimTest(80),
            '/v1/game/rewards/test',
            { percentage: 80 },
        ],
    ];

    it.each(rewardCalls)(
        '%s success normalizes reward',
        async (_n, fn, url, body) => {
            h.request.mockResolvedValue(
                ok({ species: 'SPIRIT_LOTUS', garden: rawGarden })
            );
            const res = await fn();
            expect(h.request).toHaveBeenCalledWith({
                url,
                method: 'POST',
                data: body,
            });
            expect(res.data.species).toBe('spirit_lotus');
        }
    );

    it.each(rewardCalls)('%s failure passes through', async (_n, fn) => {
        h.request.mockResolvedValue({
            data: { isSuccess: false, message: 'bad', data: null },
        });
        expect((await fn()).isSuccess).toBe(false);
    });

    it('maps thrown axios errors', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        h.request.mockRejectedValueOnce({
            response: { status: 400, data: { message: 'server says no' } },
            message: 'm',
        });
        let res = await GameService.getGarden();
        expect(res).toMatchObject({
            isSuccess: false,
            statusCode: 400,
            message: 'server says no',
            data: null,
            timestamp: '2026-01-01T00:00:00.000Z',
        });
        h.request.mockRejectedValueOnce({ message: 'boom' });
        res = await GameService.getGarden();
        expect(res).toMatchObject({ statusCode: 200, message: 'boom' });
        h.request.mockRejectedValueOnce({});
        res = await GameService.getGarden();
        expect(res.message).toBe('Network error occurred');
    });
});
