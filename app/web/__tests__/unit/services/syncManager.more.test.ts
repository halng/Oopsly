import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    healthCheck: vi.fn(),
    put: vi.fn(),
    offlineDb: {
        getPendingSyncCount: vi.fn(),
        getPendingSyncActions: vi.fn(),
        updateSyncAction: vi.fn(),
        removeSyncAction: vi.fn(),
        replaceTempCardId: vi.fn(),
        cacheCards: vi.fn(),
    },
    mapCardRes: vi.fn(),
}));

vi.mock('@/services/api', () => ({
    ApiService: { healthCheck: mocks.healthCheck },
    apiClient: { put: mocks.put },
    GRADE_LEVELS: { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' },
}));
vi.mock('@/services/offlineDb', () => ({ offlineDb: mocks.offlineDb }));
vi.mock('@/utils/cardMapper', () => ({ mapCardRes: mocks.mapCardRes }));

const okJson = (body: any, ok = true) => ({
    ok,
    json: async () => body,
});

const action = (type: string, payload: any, extra: any = {}) => ({
    id: `a-${type}`,
    type,
    payload,
    createdAt: '2025-01-01T00:00:00.000Z',
    status: 'pending',
    retryCount: 0,
    ...extra,
});

const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value,
    });

describe('SyncManager', () => {
    let syncManager: any;
    let fetchMock: ReturnType<typeof vi.fn>;
    let added: Array<[string, any]> = [];
    const realAdd = window.addEventListener.bind(window);

    const queue = (...actions: any[]) => {
        mocks.offlineDb.getPendingSyncCount.mockResolvedValue(actions.length);
        mocks.offlineDb.getPendingSyncActions.mockResolvedValue(actions);
    };

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        setOnline(true);
        mocks.healthCheck.mockResolvedValue({ isSuccess: true });
        mocks.offlineDb.getPendingSyncCount.mockResolvedValue(0);
        mocks.offlineDb.getPendingSyncActions.mockResolvedValue([]);
        mocks.offlineDb.updateSyncAction.mockResolvedValue(undefined);
        mocks.offlineDb.removeSyncAction.mockResolvedValue(undefined);
        mocks.offlineDb.replaceTempCardId.mockResolvedValue(undefined);
        mocks.offlineDb.cacheCards.mockResolvedValue(undefined);
        added = [];
        vi.spyOn(window, 'addEventListener').mockImplementation(
            (type: any, handler: any, opts?: any) => {
                added.push([type, handler]);
                realAdd(type, handler, opts);
            }
        );
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        ({ syncManager } = await import('@/services/syncManager'));
    });

    afterEach(() => {
        added.forEach(([type, handler]) =>
            window.removeEventListener(type, handler)
        );
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('status and subscriptions', () => {
        it('captures the browser online flag', () => {
            setOnline(false);
            syncManager.captureBrowserOnline();
            expect(syncManager.getStatus().isOnline).toBe(false);
        });

        it('notifies subscribers immediately and until unsubscribed', async () => {
            const listener = vi.fn();
            const unsub = syncManager.subscribe(listener);
            expect(listener).toHaveBeenCalledTimes(1);

            mocks.offlineDb.getPendingSyncCount.mockResolvedValue(4);
            await expect(syncManager.refreshPendingCount()).resolves.toBe(4);
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ pendingCount: 4 })
            );

            unsub();
            await syncManager.refreshPendingCount();
            expect(listener).toHaveBeenCalledTimes(2);
        });

        it('isolates listener errors', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            const good = vi.fn();
            syncManager.subscribe(vi.fn());
            const bad = vi
                .fn()
                .mockImplementationOnce(() => {})
                .mockImplementation(() => {
                    throw new Error('listener');
                });
            syncManager.subscribe(bad);
            syncManager.subscribe(good);
            await syncManager.refreshPendingCount();
            expect(err).toHaveBeenCalled();
            expect(good).toHaveBeenCalledTimes(2);
        });

        it('returns 0 when the pending count cannot be read', async () => {
            mocks.offlineDb.getPendingSyncCount.mockRejectedValue(
                new Error('db')
            );
            await expect(syncManager.refreshPendingCount()).resolves.toBe(0);
        });
    });

    describe('checkConnection', () => {
        it('is offline without pinging when the browser is offline', async () => {
            setOnline(false);
            await expect(syncManager.checkConnection()).resolves.toBe(false);
            expect(mocks.healthCheck).not.toHaveBeenCalled();
            expect(syncManager.getStatus().isOnline).toBe(false);
        });

        it('is offline when the ping throws', async () => {
            mocks.healthCheck.mockRejectedValue(new Error('net'));
            await expect(syncManager.checkConnection()).resolves.toBe(false);
            expect(syncManager.getStatus().isOnline).toBe(false);
        });
    });

    describe('init and events', () => {
        it('initialises once, wires events and heartbeat', async () => {
            vi.useFakeTimers();
            syncManager.init();
            syncManager.init();
            const events = added.map((c) => c[0]);
            expect(events.filter((e) => e === 'online')).toHaveLength(1);
            expect(events.filter((e) => e === 'offline')).toHaveLength(1);

            await vi.advanceTimersByTimeAsync(0);
            expect(mocks.healthCheck).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(30000);
            expect(mocks.healthCheck).toHaveBeenCalledTimes(2);
            await vi.advanceTimersByTimeAsync(30000);
            expect(mocks.healthCheck).toHaveBeenCalledTimes(3);
        });

        it('goes offline on the offline event', async () => {
            syncManager.init();
            await vi.waitFor(() =>
                expect(mocks.healthCheck).toHaveBeenCalled()
            );
            await new Promise((r) => setTimeout(r, 0));
            window.dispatchEvent(new Event('offline'));
            await Promise.resolve();
            expect(syncManager.getStatus().isOnline).toBe(false);
        });

        it('syncs shortly after the online event (debounced)', async () => {
            vi.useFakeTimers();
            queue(action('DELETE_CARD', { cardId: 'c1' }));
            fetchMock.mockResolvedValue({ ok: true });
            syncManager.init();
            await vi.advanceTimersByTimeAsync(0);

            window.dispatchEvent(new Event('online'));
            window.dispatchEvent(new Event('online'));
            await vi.advanceTimersByTimeAsync(0);
            expect(fetchMock).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(800);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('does not sync after online event if backend unreachable', async () => {
            vi.useFakeTimers();
            mocks.healthCheck.mockResolvedValue({ isSuccess: false });
            syncManager.init();
            window.dispatchEvent(new Event('online'));
            await vi.advanceTimersByTimeAsync(2000);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('syncs on service worker trigger message only', async () => {
            const handlers: Array<(e: any) => void> = [];
            const sw = {
                addEventListener: (_: string, h: any) => handlers.push(h),
            };
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: sw,
            });
            const spy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({
                success: 0,
                failed: 0,
            });
            syncManager.init();
            expect(handlers).toHaveLength(1);
            handlers[0]({ data: { type: 'OTHER' } });
            handlers[0]({ data: null });
            expect(spy).not.toHaveBeenCalled();
            handlers[0]({ data: { type: 'SYNC_TRIGGERED_FROM_SW' } });
            expect(spy).toHaveBeenCalledTimes(1);
            delete (navigator as any).serviceWorker;
        });
    });

    describe('requestBackgroundSync', () => {
        afterEach(() => {
            delete (navigator as any).serviceWorker;
            delete (window as any).SyncManager;
        });

        it('does nothing without support', async () => {
            await expect(
                syncManager.requestBackgroundSync()
            ).resolves.toBeUndefined();
        });

        it('registers the sync tag', async () => {
            const register = vi.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { ready: Promise.resolve({ sync: { register } }) },
            });
            (window as any).SyncManager = class {};
            await syncManager.requestBackgroundSync();
            expect(register).toHaveBeenCalledWith('sync-oopsly-reviews');
        });

        it('skips registration when registration.sync is missing', async () => {
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { ready: Promise.resolve({}) },
            });
            (window as any).SyncManager = class {};
            await expect(
                syncManager.requestBackgroundSync()
            ).resolves.toBeUndefined();
        });

        it('warns when registration fails', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { ready: Promise.reject(new Error('nope')) },
            });
            (window as any).SyncManager = class {};
            await syncManager.requestBackgroundSync();
            expect(warn).toHaveBeenCalled();
        });
    });

    describe('syncNow', () => {
        it('returns zeros for an empty queue', async () => {
            await expect(syncManager.syncNow()).resolves.toEqual({
                success: 0,
                failed: 0,
            });
            expect(mocks.healthCheck).not.toHaveBeenCalled();
        });

        it('reports all failed when offline', async () => {
            queue(action('DELETE_CARD', { cardId: 'c' }));
            mocks.healthCheck.mockResolvedValue({ isSuccess: false });
            await expect(syncManager.syncNow()).resolves.toEqual({
                success: 0,
                failed: 1,
            });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('ignores concurrent runs', async () => {
            queue(action('DELETE_CARD', { cardId: 'c' }));
            let release: (v: any) => void = () => {};
            fetchMock.mockReturnValue(
                new Promise((r) => {
                    release = r;
                })
            );
            const first = syncManager.syncNow();
            await vi.waitFor(() =>
                expect(syncManager.getStatus().isSyncing).toBe(true)
            );
            await expect(syncManager.syncNow()).resolves.toEqual({
                success: 0,
                failed: 0,
            });
            release({ ok: true });
            await expect(first).resolves.toEqual({ success: 1, failed: 0 });
            expect(syncManager.getStatus().isSyncing).toBe(false);
        });

        it('processes every action type and dispatches completion', async () => {
            const serverCard = { id: 'real' };
            queue(
                action('CREATE_CARD', {
                    tempId: 't',
                    subjectId: 's',
                    front: 'f',
                    back: 'b',
                    hint: 'h',
                    tags: ['x'],
                    mediaUrl: 'm',
                }),
                action('BATCH_CREATE_CARDS', {
                    subjectId: 's',
                    cards: [{ front: 'f', back: 'b', extra: 1 }],
                }),
                action('GRADE_CARD', {
                    cardId: 'c',
                    grade: 3,
                    shelfId: 'sh',
                    subjectId: 's',
                }),
                action('UPDATE_CARD', { cardId: 'c', data: { front: 'n' } }),
                action('DELETE_CARD', { cardId: 'c' }),
                action('CREATE_SHELF', {})
            );
            fetchMock
                .mockResolvedValueOnce(
                    okJson({ isSuccess: true, data: serverCard })
                )
                .mockResolvedValueOnce(
                    okJson({ isSuccess: true, data: { cards: [serverCard] } })
                )
                .mockResolvedValueOnce(
                    okJson({ isSuccess: true, data: { id: 'u' } })
                )
                .mockResolvedValueOnce({ ok: true });
            mocks.put.mockResolvedValue({
                data: { isSuccess: true, data: { cards: [{ id: 'g' }] } },
            });
            mocks.mapCardRes.mockReturnValue({ id: 'mapped' });
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const events: any[] = [];
            window.addEventListener('oopsly-sync-completed', (e: any) =>
                events.push(e.detail)
            );

            const result = await syncManager.syncNow();
            expect(result).toEqual({ success: 6, failed: 0 });

            expect(fetchMock).toHaveBeenNthCalledWith(
                1,
                '/api/subjects/s/cards',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        front: 'f',
                        back: 'b',
                        hint: 'h',
                        tags: ['x'],
                        mediaUrl: 'm',
                    }),
                })
            );
            expect(mocks.offlineDb.replaceTempCardId).toHaveBeenCalledWith(
                't',
                serverCard
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                '/api/subjects/s/cards/batch',
                expect.objectContaining({
                    body: JSON.stringify({
                        cards: [
                            {
                                front: 'f',
                                back: 'b',
                                hint: undefined,
                                tags: undefined,
                                mediaUrl: undefined,
                            },
                        ],
                    }),
                })
            );
            expect(mocks.put).toHaveBeenCalledWith(
                '/v1/shelves/sh/subjects/s/cards/difficulty',
                [{ cardId: 'c', newLevel: 'Good' }]
            );
            expect(mocks.mapCardRes).toHaveBeenCalledWith({ id: 'g' }, 's');
            expect(mocks.offlineDb.cacheCards).toHaveBeenCalledWith([
                { id: 'mapped' },
            ]);
            expect(fetchMock).toHaveBeenNthCalledWith(
                3,
                '/api/cards/c',
                expect.objectContaining({ method: 'PATCH' })
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
                4,
                '/api/cards/c/delete',
                {
                    method: 'PATCH',
                }
            );
            expect(mocks.offlineDb.removeSyncAction).toHaveBeenCalledTimes(6);
            expect(mocks.offlineDb.updateSyncAction).toHaveBeenCalledWith(
                'a-CREATE_CARD',
                { status: 'syncing' }
            );

            const status = syncManager.getStatus();
            expect(status.syncedCountInLastRun).toBe(6);
            expect(status.lastSyncTime).toBeInstanceOf(Date);
            expect(status.isSyncing).toBe(false);
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                successCount: 6,
                failedCount: 0,
            });
        });

        it.each([
            [
                'CREATE_CARD not ok',
                action('CREATE_CARD', { tempId: 't', subjectId: 's' }),
                { ok: false },
            ],
            [
                'CREATE_CARD unsuccessful',
                action('CREATE_CARD', { tempId: 't', subjectId: 's' }),
                okJson({ isSuccess: false }),
            ],
            [
                'BATCH not ok',
                action('BATCH_CREATE_CARDS', { subjectId: 's', cards: [] }),
                { ok: false },
            ],
            [
                'BATCH no cards',
                action('BATCH_CREATE_CARDS', { subjectId: 's', cards: [] }),
                okJson({ isSuccess: true, data: {} }),
            ],
            [
                'UPDATE not ok',
                action('UPDATE_CARD', { cardId: 'c', data: {} }),
                { ok: false },
            ],
            [
                'UPDATE unsuccessful',
                action('UPDATE_CARD', { cardId: 'c', data: {} }),
                okJson({ isSuccess: false }),
            ],
            [
                'DELETE not ok',
                action('DELETE_CARD', { cardId: 'c' }),
                { ok: false },
            ],
        ])('marks %s as failed and bumps retryCount', async (_n, act, res) => {
            queue({ ...act, retryCount: 2 });
            fetchMock.mockResolvedValue(res);
            const result = await syncManager.syncNow();
            expect(result).toEqual({ success: 0, failed: 1 });
            expect(mocks.offlineDb.removeSyncAction).not.toHaveBeenCalled();
            expect(mocks.offlineDb.updateSyncAction).toHaveBeenCalledWith(
                act.id,
                { status: 'failed', retryCount: 3 }
            );
        });

        it('fails GRADE_CARD without shelf or subject context', async () => {
            queue(action('GRADE_CARD', { cardId: 'c', grade: 3 }));
            const result = await syncManager.syncNow();
            expect(result.failed).toBe(1);
            expect(mocks.put).not.toHaveBeenCalled();
        });

        it('treats GRADE_CARD success without card payload as success', async () => {
            queue(
                action('GRADE_CARD', {
                    cardId: 'c',
                    grade: 3,
                    shelfId: 'sh',
                    subjectId: 's',
                })
            );
            mocks.put.mockResolvedValue({ data: { isSuccess: true } });
            expect(await syncManager.syncNow()).toEqual({
                success: 1,
                failed: 0,
            });
            expect(mocks.offlineDb.cacheCards).not.toHaveBeenCalled();
        });

        it('treats GRADE_CARD unsuccessful or empty response as failure', async () => {
            queue(
                action('GRADE_CARD', {
                    cardId: 'c',
                    grade: 3,
                    shelfId: 'sh',
                    subjectId: 's',
                })
            );
            mocks.put.mockResolvedValue({ data: undefined });
            expect(await syncManager.syncNow()).toEqual({
                success: 0,
                failed: 1,
            });
        });

        it('records thrown errors with message and a default message', async () => {
            queue(
                action('DELETE_CARD', { cardId: '1' }, { id: 'e1' }),
                action('DELETE_CARD', { cardId: '2' }, { id: 'e2' })
            );
            fetchMock
                .mockRejectedValueOnce(new Error('network down'))
                .mockRejectedValueOnce({});
            const result = await syncManager.syncNow();
            expect(result).toEqual({ success: 0, failed: 2 });
            expect(mocks.offlineDb.updateSyncAction).toHaveBeenCalledWith(
                'e1',
                {
                    status: 'failed',
                    retryCount: 1,
                    errorMessage: 'network down',
                }
            );
            expect(mocks.offlineDb.updateSyncAction).toHaveBeenCalledWith(
                'e2',
                {
                    status: 'failed',
                    retryCount: 1,
                    errorMessage: 'Sync failed',
                }
            );
        });

        it('defaults retryCount when missing', async () => {
            queue(
                action(
                    'DELETE_CARD',
                    { cardId: '1' },
                    { retryCount: undefined }
                )
            );
            fetchMock.mockResolvedValue({ ok: false });
            await syncManager.syncNow();
            expect(mocks.offlineDb.updateSyncAction).toHaveBeenCalledWith(
                'a-DELETE_CARD',
                { status: 'failed', retryCount: 1 }
            );
        });

        it('captures a fatal error and resets syncing state', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            mocks.offlineDb.getPendingSyncCount.mockResolvedValue(1);
            mocks.offlineDb.getPendingSyncActions.mockRejectedValue(
                new Error('queue broken')
            );
            const result = await syncManager.syncNow();
            expect(result).toEqual({ success: 0, failed: 0 });
            expect(syncManager.getStatus()).toMatchObject({
                lastError: 'queue broken',
                isSyncing: false,
            });
            expect(err).toHaveBeenCalled();
        });

        it('uses a default fatal error message', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            mocks.offlineDb.getPendingSyncCount.mockResolvedValue(1);
            mocks.offlineDb.getPendingSyncActions.mockRejectedValue({});
            await syncManager.syncNow();
            expect(syncManager.getStatus().lastError).toBe(
                'Synchronization failed'
            );
        });
    });
});
