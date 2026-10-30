import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store';
import {
    ApiService,
    apiClient,
    authClient,
    GRADE_LEVELS,
} from '@/services/api';
import { offlineDb } from '@/services/offlineDb';
import { syncManager } from '@/services/syncManager';
import { useToastStore } from '@/store/ToastStore';
import { ApiError } from '@/utils/apiError';

vi.mock('@/services/offlineDb', () => ({
    offlineDb: {
        setMetadata: vi.fn(),
        getMetadata: vi.fn(),
        cacheShelves: vi.fn(),
        getCachedShelves: vi.fn(),
        cacheSubjects: vi.fn(),
        getCachedSubjects: vi.fn(),
        getCachedSubjectById: vi.fn(),
        getCachedCardsBySubject: vi.fn(),
        getCachedDueCardsBySubject: vi.fn(),
        cacheCards: vi.fn(),
        saveOfflineBatchCards: vi.fn(),
        saveOfflineCardUpdate: vi.fn(),
        saveOfflineCardReview: vi.fn(),
        saveOfflineCardDelete: vi.fn(),
    },
}));

vi.mock('@/services/syncManager', () => ({
    syncManager: {
        requestBackgroundSync: vi.fn(),
        refreshPendingCount: vi.fn(),
    },
}));

const db = vi.mocked(offlineDb) as any;
const sync = vi.mocked(syncManager) as any;

const okRes = (data: unknown) => ({
    data: { isSuccess: true, statusCode: 200, message: 'ok', data },
});
const failRes = (message = 'bad') => ({
    data: { isSuccess: false, statusCode: 400, message, data: null },
});

function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('ApiService', () => {
    let apiReq: any;
    let authReq: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));
        setOnline(true);
        apiReq = vi.spyOn(apiClient, 'request');
        authReq = vi.spyOn(authClient, 'request');
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('axios clients', () => {
        const adapter = (cfg: any) =>
            Promise.resolve({
                data: { ok: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: cfg,
            });

        it('request interceptor adds auth, request id and platform', async () => {
            vi.restoreAllMocks();
            useAuthStore.setState({ accessToken: 'tkn' } as never);
            let seen: any;
            await apiClient.get('/x', {
                adapter: (cfg: any) => {
                    seen = cfg;
                    return adapter(cfg);
                },
            });
            expect(seen.headers.Authorization).toBe('Bearer tkn');
            expect(seen.headers['X-Platform']).toBe('WEB');
            expect(seen.headers['X-Request-ID']).toBeTruthy();

            useAuthStore.setState({ accessToken: '' } as never);
            await authClient.get('/x', {
                adapter: (cfg: any) => {
                    seen = cfg;
                    return adapter(cfg);
                },
            });
            expect(seen.headers.Authorization).toBeUndefined();
        });

        it('response interceptor normalises errors', async () => {
            vi.restoreAllMocks();
            const fail = (e: any) =>
                apiClient.get('/x', { adapter: () => Promise.reject(e) });
            await expect(
                fail({ response: { status: 400, data: { message: 'srv' } } })
            ).rejects.toThrow('srv');
            await expect(
                fail({ response: { status: 500, data: {} } })
            ).rejects.toThrow('Request failed with status 500');
            await expect(fail({ request: {} })).rejects.toThrow(
                'Network error occurred'
            );
            await expect(fail({ message: 'weird' })).rejects.toThrow('weird');
            await expect(fail({})).rejects.toThrow('Request failed');
        });
    });

    describe('error handling', () => {
        const fail = (e: any) =>
            apiClient.get('/x', { adapter: () => Promise.reject(e) });

        it('rejects with an ApiError carrying status and kind', async () => {
            vi.restoreAllMocks();
            const cases: [any, string, number | undefined][] = [
                [
                    { response: { status: 400, data: { message: 'm' } } },
                    'validation',
                    400,
                ],
                [{ response: { status: 403, data: {} } }, 'forbidden', 403],
                [{ response: { status: 404, data: {} } }, 'notFound', 404],
                [{ response: { status: 409, data: {} } }, 'conflict', 409],
                [{ response: { status: 429, data: {} } }, 'rateLimited', 429],
                [{ response: { status: 503, data: {} } }, 'server', 503],
                [{ request: {}, code: 'ECONNABORTED' }, 'timeout', undefined],
                [{ request: {} }, 'network', undefined],
                [{ message: 'odd' }, 'unknown', undefined],
            ];
            for (const [error, kind, status] of cases) {
                const err = await fail(error).catch((e) => e);
                expect(err).toBeInstanceOf(ApiError);
                expect(err).toMatchObject({ kind, status });
            }
        });

        it('reports an offline browser as offline', async () => {
            vi.restoreAllMocks();
            setOnline(false);
            const err = await fail({ request: {} }).catch((e) => e);
            expect(err.kind).toBe('offline');
        });

        it('treats a 401 after the session is gone as a session error', async () => {
            vi.restoreAllMocks();
            useAuthStore.setState({ sessionExpired: true } as never);
            try {
                const err = await fail({
                    response: { status: 401, data: {} },
                }).catch((e) => e);
                expect(err).toMatchObject({ kind: 'session', status: 401 });
            } finally {
                useAuthStore.setState({ sessionExpired: false } as never);
            }
        });
    });

    describe('failure notifications', () => {
        beforeEach(() => useToastStore.setState({ toasts: [] }));
        const toasts = () => useToastStore.getState().toasts;

        it('toasts a humanized reason when a write fails', async () => {
            apiReq.mockRejectedValue(
                new ApiError('java.lang.NullPointerException', 'server', 500)
            );
            const res = await ApiService.updateShelf('s1', {
                name: 'x',
            } as never);
            expect(res).toMatchObject({ isSuccess: false, statusCode: 500 });
            expect(toasts()).toHaveLength(1);
            expect(toasts()[0]).toMatchObject({
                kind: 'error',
                title: "Couldn't save your changes",
            });
            expect(toasts()[0].description).toMatch(/on our side/i);
            expect(toasts()[0].description).not.toMatch(/NullPointer/);
        });

        it('titles failed creates and deletes by method', async () => {
            apiReq.mockRejectedValue(
                new ApiError('Name is taken', 'conflict', 409)
            );
            await ApiService.createShelf({ name: 'x' } as never);
            expect(toasts()[0]).toMatchObject({
                title: "Couldn't create that",
                description: 'Name is taken.',
            });
        });

        it('stays quiet for failed reads', async () => {
            apiReq.mockRejectedValue(new ApiError('x', 'server', 500));
            await ApiService.getStats();
            expect(toasts()).toEqual([]);
        });

        it('leaves login errors to the form', async () => {
            apiReq.mockRejectedValue(new ApiError('x', 'server', 500));
            authReq.mockRejectedValue(
                new ApiError('Invalid code', 'validation', 400)
            );
            await ApiService.sendOtp('a@b.c');
            await ApiService.verifyOtp('a@b.c', '000000', 'n');
            expect(toasts()).toEqual([]);
        });

        it('stays quiet when the session expired', async () => {
            apiReq.mockRejectedValue(new ApiError('expired', 'session', 401));
            await ApiService.createShelf({ name: 'x' } as never);
            expect(toasts()).toEqual([]);
        });

        it('createQuestion can be silenced for batch imports', async () => {
            apiReq.mockRejectedValue(new ApiError('x', 'server', 500));
            await ApiService.createQuestion('s', 't', { text: 'q' } as never, {
                silent: true,
            });
            expect(toasts()).toEqual([]);
            await ApiService.createQuestion('s', 't', { text: 'q' } as never);
            expect(toasts()).toHaveLength(1);
        });

        it('reports status 0 when no response arrived', async () => {
            apiReq.mockRejectedValue(new Error('boom'));
            const res = await ApiService.createShelf({ name: 'x' } as never);
            expect(res.statusCode).toBe(0);
        });
    });

    describe('fetchJson / healthCheck', () => {
        it('maps thrown errors into failure responses', async () => {
            apiReq.mockRejectedValue(new Error('down'));
            const res = await ApiService.getStats();
            expect(res).toMatchObject({
                isSuccess: false,
                statusCode: 0,
                message: 'down',
                data: null,
                timestamp: '2026-03-01T00:00:00.000Z',
            });
            apiReq.mockRejectedValue(undefined);
            expect((await ApiService.getStats()).message).toBe(
                'Network error occurred'
            );
        });

        it('healthCheck success and failure', async () => {
            apiReq.mockResolvedValue(okRes(null));
            expect((await ApiService.healthCheck()).isSuccess).toBe(true);
            expect(apiReq).toHaveBeenCalledWith({
                url: '/v1/ping',
                method: 'GET',
                timeout: 3000,
            });
            apiReq.mockRejectedValue(new Error('x'));
            expect(await ApiService.healthCheck()).toMatchObject({
                isSuccess: false,
                message: 'x',
            });
            apiReq.mockRejectedValue(null);
            expect((await ApiService.healthCheck()).message).toBe(
                'Network error occurred'
            );
        });
    });

    describe('simple endpoints', () => {
        const cases: [
            string,
            () => any,
            'api' | 'auth',
            string,
            string,
            unknown,
        ][] = [
            [
                'sendOtp',
                () => ApiService.sendOtp('a@b.c'),
                'auth',
                'POST',
                '/v1/otp?email=a@b.c',
                undefined,
            ],
            [
                'verifyOtp',
                () => ApiService.verifyOtp('e', 'o', 'n'),
                'auth',
                'POST',
                '/v1/otp/validate',
                { email: 'e', otp: 'o', name: 'n' },
            ],
            [
                'updateProfile',
                () => ApiService.updateProfile({ name: 'x' } as any),
                'auth',
                'PATCH',
                '/v1/user-profiles',
                { name: 'x' },
            ],
            [
                'updateSettings',
                () => ApiService.updateSettings({ theme: 'dark' } as any),
                'auth',
                'PATCH',
                '/v1/user-settings',
                { theme: 'dark' },
            ],
            [
                'createShelf',
                () =>
                    ApiService.createShelf({
                        name: 'My Shelf!',
                        description: 'd',
                        icon: 'i',
                        color: 'c',
                    }),
                'api',
                'POST',
                '/v1/shelves',
                {
                    name: 'My Shelf!',
                    description: 'd',
                    icon: 'i',
                    color: 'c',
                    slug: 'my-shelf',
                },
            ],
            [
                'updateShelf',
                () => ApiService.updateShelf('s1', { name: 'n' }),
                'api',
                'PATCH',
                '/v1/shelves/s1',
                { name: 'n' },
            ],
            [
                'deleteShelf',
                () => ApiService.deleteShelf('s1'),
                'api',
                'PATCH',
                '/v1/shelves/s1/delete',
                undefined,
            ],
            [
                'createSubject',
                () =>
                    ApiService.createSubject('s1', {
                        name: 'Hello World',
                        description: 'd',
                        color: 'c',
                        tags: 't',
                        isPublic: true,
                    }),
                'api',
                'POST',
                '/v1/shelves/s1/subjects',
                {
                    name: 'Hello World',
                    description: 'd',
                    color: 'c',
                    tags: 't',
                    isPublic: true,
                    slug: 'hello-world',
                },
            ],
            [
                'updateSubject',
                () => ApiService.updateSubject('u', { name: 'n' }),
                'api',
                'PATCH',
                '/api/subjects/u',
                { name: 'n' },
            ],
            [
                'deleteSubject',
                () => ApiService.deleteSubject('u'),
                'api',
                'PATCH',
                '/api/subjects/u/delete',
                undefined,
            ],
            [
                'getDiscoverCatalog',
                () => ApiService.getDiscoverCatalog(),
                'api',
                'GET',
                '/discover?page=0&size=50',
                undefined,
            ],
            [
                'getDiscoverTestSuites',
                () => ApiService.getDiscoverTestSuites(' bio '),
                'api',
                'GET',
                '/discover/test-suites?page=0&size=50&q=bio',
                undefined,
            ],
            [
                'cloneTestSuite',
                () => ApiService.cloneTestSuite('u', 't'),
                'api',
                'POST',
                '/discover/test-suites/u/clone',
                { shelfId: 't' },
            ],
            [
                'cloneSubject',
                () => ApiService.cloneSubject('u', 't'),
                'api',
                'POST',
                '/discover/u/clone',
                { shelfId: 't' },
            ],
            [
                'logStudySession',
                () => ApiService.logStudySession('s', 'u', { a: 1 } as any),
                'api',
                'POST',
                '/v1/shelves/s/subjects/u/study-sessions',
                { a: 1 },
            ],
            [
                'getTestSuites',
                () => ApiService.getTestSuites('s'),
                'api',
                'GET',
                '/v1/shelves/s/test-suites',
                undefined,
            ],
            [
                'createTestSuite',
                () => ApiService.createTestSuite('s', { n: 1 } as any),
                'api',
                'POST',
                '/v1/shelves/s/test-suites',
                { n: 1 },
            ],
            [
                'updateTestSuite',
                () => ApiService.updateTestSuite('s', 't', { n: 1 } as any),
                'api',
                'PUT',
                '/v1/shelves/s/test-suites/t',
                { n: 1 },
            ],
            [
                'deleteTestSuite',
                () => ApiService.deleteTestSuite('s', 't'),
                'api',
                'PATCH',
                '/v1/shelves/s/test-suites/t',
                undefined,
            ],
            [
                'getTestAttempt',
                () => ApiService.getTestAttempt('s', 't'),
                'api',
                'GET',
                '/v1/shelves/s/test-suites/t/attempt',
                undefined,
            ],
            [
                'submitTestSuite',
                () => ApiService.submitTestSuite('s', 't', { a: 1 } as any),
                'api',
                'POST',
                '/v1/shelves/s/test-suites/t/submit',
                { a: 1 },
            ],
            [
                'getQuestions',
                () => ApiService.getQuestions('s', 't'),
                'api',
                'GET',
                '/v1/shelves/s/test-suites/t/questions',
                undefined,
            ],
            [
                'createQuestion',
                () => ApiService.createQuestion('s', 't', { q: 1 } as any),
                'api',
                'POST',
                '/v1/shelves/s/test-suites/t/questions',
                { q: 1 },
            ],
            [
                'createQuestionsBulk',
                () =>
                    ApiService.createQuestionsBulk('s', 't', [{ q: 1 }] as any),
                'api',
                'POST',
                '/v1/shelves/s/test-suites/t/questions/bulk',
                { questions: [{ q: 1 }] },
            ],
            [
                'updateQuestion',
                () => ApiService.updateQuestion('s', 't', 'q', { q: 1 } as any),
                'api',
                'PUT',
                '/v1/shelves/s/test-suites/t/questions/q',
                { q: 1 },
            ],
            [
                'deleteQuestion',
                () => ApiService.deleteQuestion('s', 't', 'q'),
                'api',
                'PATCH',
                '/v1/shelves/s/test-suites/t/questions/q',
                undefined,
            ],
            [
                'getStats',
                () => ApiService.getStats(),
                'api',
                'GET',
                '/v1/users/me/stats',
                undefined,
            ],
            [
                'getLeaderboard',
                () => ApiService.getLeaderboard(),
                'api',
                'GET',
                '/leaderboard',
                undefined,
            ],
            [
                'getCommunities',
                () => ApiService.getCommunities(),
                'api',
                'GET',
                '/communities',
                undefined,
            ],
            [
                'getMyCommunities',
                () => ApiService.getMyCommunities(),
                'api',
                'GET',
                '/communities/my',
                undefined,
            ],
            [
                'createCommunity',
                () => ApiService.createCommunity({ name: 'c' }),
                'api',
                'POST',
                '/communities',
                { name: 'c' },
            ],
            [
                'joinCommunity',
                () => ApiService.joinCommunity('c', 'hi'),
                'api',
                'POST',
                '/communities/c/join',
                { message: 'hi' },
            ],
            [
                'leaveCommunity',
                () => ApiService.leaveCommunity('c'),
                'api',
                'POST',
                '/communities/c/leave',
                undefined,
            ],
            [
                'inviteUserToCommunity',
                () => ApiService.inviteUserToCommunity('c', 'bob'),
                'api',
                'POST',
                '/communities/c/invite',
                { emailOrName: 'bob' },
            ],
            [
                'getCommunityJoinRequests',
                () => ApiService.getCommunityJoinRequests('c'),
                'api',
                'GET',
                '/communities/c/requests',
                undefined,
            ],
            [
                'approveJoinRequest',
                () => ApiService.approveJoinRequest('c', 'r'),
                'api',
                'POST',
                '/communities/c/requests/r/approve',
                undefined,
            ],
            [
                'rejectJoinRequest',
                () => ApiService.rejectJoinRequest('c', 'r'),
                'api',
                'POST',
                '/communities/c/requests/r/reject',
                undefined,
            ],
            [
                'getCommunityLeaderboard',
                () => ApiService.getCommunityLeaderboard('c'),
                'api',
                'GET',
                '/communities/c/leaderboard',
                undefined,
            ],
            [
                'generateCardsWithAI',
                () => ApiService.generateCardsWithAI('t', 'n'),
                'api',
                'POST',
                '/api/generate-cards',
                { topic: 't', notes: 'n', count: 5 },
            ],
            [
                'getQuestions headers',
                () => ApiService.getQuestions('s', 't'),
                'api',
                'GET',
                '/v1/shelves/s/test-suites/t/questions',
                undefined,
            ],
        ];

        it.each(cases)('%s', async (_n, call, which, method, url, body) => {
            const spy = which === 'api' ? apiReq : authReq;
            spy.mockResolvedValue(okRes('r'));
            const res = await call();
            expect(res.data).toBe('r');
            expect(spy).toHaveBeenCalledWith({
                url,
                method,
                data: body,
                headers: undefined,
            });
        });

        it('updateNewComer fires a PATCH on the auth client', () => {
            authReq.mockResolvedValue(okRes(null));
            ApiService.updateNewComer();
            expect(authReq).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/v1/user-profiles/settings/newcomer',
                    method: 'PATCH',
                })
            );
        });
    });

    describe('getProfile', () => {
        it('caches on success', async () => {
            authReq.mockResolvedValue(okRes({ id: 'p' }));
            const res = await ApiService.getProfile();
            expect(res.data).toEqual({ id: 'p' });
            expect(db.setMetadata).toHaveBeenCalledWith('user_profile', {
                id: 'p',
            });
        });
        it('falls back to cache offline', async () => {
            setOnline(false);
            authReq.mockResolvedValue(failRes());
            db.getMetadata.mockResolvedValue({ id: 'cached' });
            const res = await ApiService.getProfile();
            expect(res).toMatchObject({
                isSuccess: true,
                data: { id: 'cached' },
            });
        });
        it('returns failure when offline without cache or online failure', async () => {
            setOnline(false);
            authReq.mockResolvedValue(failRes('x'));
            db.getMetadata.mockResolvedValue(null);
            expect((await ApiService.getProfile()).isSuccess).toBe(false);
            setOnline(true);
            expect((await ApiService.getProfile()).message).toBe('x');
        });
    });

    describe('getShelves', () => {
        it('caches entities on success', async () => {
            const data = { entities: [{ id: 's' }] };
            apiReq.mockResolvedValue(okRes(data));
            const res = await ApiService.getShelves(1, 10);
            expect(res.data).toEqual(data);
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({ url: '/v1/shelves?page=1&size=10' })
            );
            expect(db.cacheShelves).toHaveBeenCalledWith(data.entities);
        });
        it('uses cached shelves offline', async () => {
            setOnline(false);
            apiReq.mockResolvedValue(failRes());
            db.getCachedShelves.mockResolvedValue([
                { id: 'a' },
                { id: 'b' },
                { id: 'c' },
            ]);
            const res = await ApiService.getShelves(1, 2);
            expect(res.data).toMatchObject({
                currentPage: 1,
                totalItems: 3,
                totalPages: 2,
                hasNextPage: true,
            });
        });
        it('returns failure when cache empty or online', async () => {
            apiReq.mockResolvedValue(failRes('e'));
            expect((await ApiService.getShelves(1, 2)).message).toBe('e');
            setOnline(false);
            db.getCachedShelves.mockResolvedValue([]);
            expect((await ApiService.getShelves(1, 2)).isSuccess).toBe(false);
        });
    });

    describe('getShelfSubjects', () => {
        it('caches on success', async () => {
            apiReq.mockResolvedValue(okRes({ entities: [{ id: 'x' }] }));
            await ApiService.getShelfSubjects('s');
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/v1/shelves/s/subjects?page=1&size=10',
                })
            );
            expect(db.cacheSubjects).toHaveBeenCalledWith([{ id: 'x' }]);
        });
        it('offline cache and failures', async () => {
            apiReq.mockResolvedValue(failRes());
            expect(
                (await ApiService.getShelfSubjects('s', 2, 5)).isSuccess
            ).toBe(false);
            setOnline(false);
            db.getCachedSubjects.mockResolvedValue([{ id: 'x' }]);
            const res = await ApiService.getShelfSubjects('s');
            expect(res.data).toMatchObject({
                totalPages: 1,
                hasNextPage: false,
            });
            db.getCachedSubjects.mockResolvedValue([]);
            expect((await ApiService.getShelfSubjects('s')).isSuccess).toBe(
                false
            );
        });
    });

    describe('getSubject', () => {
        it('caches cards and subject on success', async () => {
            apiReq.mockResolvedValue(okRes({ id: 'u', cards: [{ id: 'c' }] }));
            await ApiService.getSubject('u');
            expect(db.cacheCards).toHaveBeenCalledWith([{ id: 'c' }]);
            expect(db.cacheSubjects).toHaveBeenCalled();
        });
        it('skips card caching when none', async () => {
            apiReq.mockResolvedValue(okRes({ id: 'u' }));
            await ApiService.getSubject('u');
            expect(db.cacheCards).not.toHaveBeenCalled();
        });
        it('offline fallback computes due count', async () => {
            setOnline(false);
            apiReq.mockResolvedValue(failRes());
            db.getCachedSubjectById.mockResolvedValue({ id: 'u', name: 'S' });
            db.getCachedCardsBySubject.mockResolvedValue([
                { id: '1', dueDate: '2026-01-01T00:00:00Z' },
                { id: '2', dueDate: '2027-01-01T00:00:00Z' },
            ]);
            const res = await ApiService.getSubject('u');
            expect(res.data).toMatchObject({
                cardCount: 2,
                dueCount: 1,
                testSuites: [],
            });
        });
        it('returns failure without cached subject', async () => {
            setOnline(false);
            apiReq.mockResolvedValue(failRes());
            db.getCachedSubjectById.mockResolvedValue(null);
            db.getCachedCardsBySubject.mockResolvedValue([]);
            expect((await ApiService.getSubject('u')).isSuccess).toBe(false);
        });
        it('returns failure online', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.getSubject('u')).isSuccess).toBe(false);
        });
    });

    describe('getSubjectCards', () => {
        const card = { id: 'c', front: 'f', back: 'b', fsrsStability: 1 };
        it('maps and caches cards', async () => {
            apiReq.mockResolvedValue(
                okRes({ entities: [card], totalItems: 1 })
            );
            const res = await ApiService.getSubjectCards('s', 'u');
            expect(res.data!.entities[0]).toMatchObject({
                id: 'c',
                subjectId: 'u',
                stability: 1,
            });
            expect(db.cacheCards).toHaveBeenCalledWith(res.data!.entities);
        });
        it('offline fallback', async () => {
            setOnline(false);
            apiReq.mockResolvedValue(failRes());
            db.getCachedCardsBySubject.mockResolvedValue([{ id: 'c' }]);
            expect(
                (await ApiService.getSubjectCards('s', 'u')).message
            ).toContain('offline');
            db.getCachedCardsBySubject.mockResolvedValue([]);
            expect((await ApiService.getSubjectCards('s', 'u')).isSuccess).toBe(
                false
            );
        });
        it('online failure', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.getSubjectCards('s', 'u')).isSuccess).toBe(
                false
            );
        });
    });

    describe('getDueCards', () => {
        it('builds query and maps cards', async () => {
            apiReq.mockResolvedValue(
                okRes([{ id: 'c', front: 'f', back: 'b', fsrsStability: 1 }])
            );
            const res = await ApiService.getDueCards('s', 'u', 5, 2);
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/v1/shelves/s/subjects/u/cards/due?limit=5&newLimit=2',
                })
            );
            expect(res.data![0].subjectId).toBe('u');
            expect(db.cacheCards).toHaveBeenCalled();
        });
        it('defaults limit and omits newLimit', async () => {
            apiReq.mockResolvedValue(okRes([]));
            await ApiService.getDueCards('s', 'u');
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/v1/shelves/s/subjects/u/cards/due?limit=20',
                })
            );
        });
        it('offline fallback and failure', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.getDueCards('s', 'u')).isSuccess).toBe(
                false
            );
            setOnline(false);
            db.getCachedDueCardsBySubject.mockResolvedValue([{ id: 'd' }]);
            const res = await ApiService.getDueCards('s', 'u');
            expect(res).toMatchObject({ isSuccess: true, data: [{ id: 'd' }] });
        });
    });

    describe('getDuePracticeCards', () => {
        it('maps practice cards and caches', async () => {
            apiReq.mockResolvedValue(
                okRes([
                    {
                        id: 'c',
                        front: 'f',
                        back: 'b',
                        shelfId: 'sh',
                        subjectId: 'su',
                        subjectName: 'N',
                        fsrsStability: 1,
                    },
                ])
            );
            const res = await ApiService.getDuePracticeCards();
            expect(res.data![0]).toMatchObject({
                shelfId: 'sh',
                subjectId: 'su',
                subjectName: 'N',
            });
            expect(db.cacheCards).toHaveBeenCalled();
        });
        it('returns null data on failure', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.getDuePracticeCards()).data).toBeNull();
        });
    });

    describe('createCards', () => {
        const cards = [{ front: 'f', back: 'b', hint: 'h' }];
        beforeEach(() =>
            db.saveOfflineBatchCards.mockResolvedValue({ importedCount: 1 })
        );

        it('saves offline when navigator is offline', async () => {
            setOnline(false);
            const res = await ApiService.createCards('s', 'u', cards);
            expect(apiReq).not.toHaveBeenCalled();
            expect(res.message).toContain('Imported 1 cards offline');
            expect(sync.requestBackgroundSync).toHaveBeenCalled();
            expect(sync.refreshPendingCount).toHaveBeenCalled();
        });
        it('posts online', async () => {
            apiReq.mockResolvedValue(okRes('created'));
            const res = await ApiService.createCards('s', 'u', cards);
            expect(res.data).toBe('created');
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'POST', data: { cards } })
            );
        });
        it('returns failure online', async () => {
            apiReq.mockResolvedValue(failRes('no'));
            expect(
                (await ApiService.createCards('s', 'u', cards)).message
            ).toBe('no');
            expect(db.saveOfflineBatchCards).not.toHaveBeenCalled();
        });
        it('falls back offline if connection drops during request', async () => {
            apiReq.mockImplementation(async () => {
                setOnline(false);
                return failRes();
            });
            const res = await ApiService.createCards('s', 'u', cards);
            expect(res.isSuccess).toBe(true);
            expect(db.saveOfflineBatchCards).toHaveBeenCalledWith('u', cards);
        });
    });

    describe('updateCard', () => {
        beforeEach(() =>
            db.saveOfflineCardUpdate.mockResolvedValue({ id: 'c', front: 'n' })
        );

        it('offline', async () => {
            setOnline(false);
            const res = await ApiService.updateCard('c', { front: 'n' });
            expect(res.message).toContain('will sync');
            expect(res.data).toEqual({ id: 'c', front: 'n' });
        });
        it('online success caches', async () => {
            apiReq.mockResolvedValue(okRes({ id: 'c' }));
            await ApiService.updateCard('c', { front: 'n' });
            expect(db.cacheCards).toHaveBeenCalledWith([{ id: 'c' }]);
        });
        it('online failure', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.updateCard('c', {})).isSuccess).toBe(
                false
            );
        });
        it('drops offline mid-request', async () => {
            apiReq.mockImplementation(async () => {
                setOnline(false);
                return failRes();
            });
            const res = await ApiService.updateCard('c', { front: 'n' });
            expect(res.message).toBe('Card updated offline');
            expect(sync.requestBackgroundSync).toHaveBeenCalled();
        });
    });

    describe('gradeCard', () => {
        it('maps GRADE_LEVELS', () => {
            expect(GRADE_LEVELS).toEqual({
                1: 'AGAIN',
                2: 'HARD',
                3: 'GOOD',
                4: 'EASY',
            });
        });
        it('offline', async () => {
            setOnline(false);
            db.saveOfflineCardReview.mockResolvedValue({
                card: null,
                xpGained: 1,
                totalXp: 2,
            });
            const res = await ApiService.gradeCard('s', 'u', 'c', 3);
            expect(db.saveOfflineCardReview).toHaveBeenCalledWith('c', 3, {
                shelfId: 's',
                subjectId: 'u',
            });
            expect(res.message).toContain('FSRS');
        });
        it('online success maps card and caches', async () => {
            apiReq.mockResolvedValue(
                okRes({
                    cards: [
                        { id: 'c', front: 'f', back: 'b', fsrsStability: 2 },
                    ],
                    xpGained: 5,
                    totalXp: 50,
                })
            );
            const res = await ApiService.gradeCard('s', 'u', 'c', 4);
            expect(apiReq).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/v1/shelves/s/subjects/u/cards/difficulty',
                    method: 'PUT',
                    data: [{ cardId: 'c', newLevel: 'EASY' }],
                })
            );
            expect(res.data).toMatchObject({
                xpGained: 5,
                totalXp: 50,
                card: { id: 'c', stability: 2 },
            });
            expect(db.cacheCards).toHaveBeenCalled();
        });
        it('online success without cards', async () => {
            apiReq.mockResolvedValue(
                okRes({ cards: [], xpGained: 1, totalXp: 2 })
            );
            const res = await ApiService.gradeCard('s', 'u', 'c', 1);
            expect(res.data!.card).toBeNull();
            expect(db.cacheCards).not.toHaveBeenCalled();
        });
        it('failure online returns null data', async () => {
            apiReq.mockResolvedValue(failRes());
            const res = await ApiService.gradeCard('s', 'u', 'c', 2);
            expect(res).toMatchObject({ isSuccess: false, data: null });
        });
        it('drops offline mid-request', async () => {
            db.saveOfflineCardReview.mockResolvedValue({
                card: null,
                xpGained: 0,
                totalXp: 0,
            });
            apiReq.mockImplementation(async () => {
                setOnline(false);
                return failRes();
            });
            const res = await ApiService.gradeCard('s', 'u', 'c', 2);
            expect(res.message).toBe(
                'Review saved offline (will sync when online)'
            );
        });
    });

    describe('deleteCard', () => {
        it('offline', async () => {
            setOnline(false);
            const res = await ApiService.deleteCard('c');
            expect(db.saveOfflineCardDelete).toHaveBeenCalledWith('c');
            expect(res.message).toContain('will sync');
        });
        it('online success', async () => {
            apiReq.mockResolvedValue(okRes(null));
            const res = await ApiService.deleteCard('c');
            expect(res.isSuccess).toBe(true);
            expect(db.saveOfflineCardDelete).toHaveBeenCalledWith('c');
            expect(sync.requestBackgroundSync).not.toHaveBeenCalled();
        });
        it('online failure', async () => {
            apiReq.mockResolvedValue(failRes());
            expect((await ApiService.deleteCard('c')).isSuccess).toBe(false);
        });
        it('drops offline mid-request', async () => {
            apiReq.mockImplementation(async () => {
                setOnline(false);
                return failRes();
            });
            const res = await ApiService.deleteCard('c');
            expect(res.message).toBe('Card deleted offline');
        });
    });
});
