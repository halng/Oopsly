import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineDb } from '@/services/offlineDb';

const db = offlineDb as any;

const makeCard = (over: Record<string, any> = {}) => ({
    id: 'c1',
    subjectId: 's1',
    front: 'F',
    back: 'B',
    tags: [],
    difficulty: 3,
    stability: 0.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: '2000-01-01T00:00:00.000Z',
    isDeleted: false,
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    ...over,
});

const makeSubject = (over: Record<string, any> = {}) => ({
    id: 's1',
    shelfId: 'sh1',
    name: 'Subj',
    cardCount: 2,
    dueCount: 1,
    isDeleted: false,
    ...over,
});

describe('offlineDb', () => {
    beforeEach(() => {
        (globalThis as any).indexedDB = new IDBFactory();
        db.dbPromise = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('database opening', () => {
        it('rejects when IndexedDB is unavailable', async () => {
            const original = (globalThis as any).indexedDB;
            (globalThis as any).indexedDB = undefined;
            await expect(offlineDb.getCachedShelves()).rejects.toThrow(
                'IndexedDB is not supported'
            );
            (globalThis as any).indexedDB = original;
        });

        it('rejects when opening fails', async () => {
            (globalThis as any).indexedDB = {
                open: () => {
                    const req: any = { error: null };
                    setTimeout(() => req.onerror(), 0);
                    return req;
                },
            };
            await expect(offlineDb.getCachedShelves()).rejects.toThrow(
                'Failed to open IndexedDB'
            );
        });

        it('rejects with the request error when present', async () => {
            const err = new Error('boom');
            (globalThis as any).indexedDB = {
                open: () => {
                    const req: any = { error: err };
                    setTimeout(() => req.onerror(), 0);
                    return req;
                },
            };
            await expect(offlineDb.getCachedShelves()).rejects.toBe(err);
        });

        it('reuses the same connection promise', async () => {
            await offlineDb.getCachedShelves();
            const first = db.dbPromise;
            await offlineDb.getCachedShelves();
            expect(db.dbPromise).toBe(first);
        });

        it('rejects transactions on unknown stores', async () => {
            await expect(
                db.performTransaction('nope', 'readonly', (s: any) =>
                    s.getAll()
                )
            ).rejects.toBeTruthy();
        });

        it('resolves transactions whose callback returns nothing', async () => {
            await expect(
                db.performTransaction('shelves', 'readonly', () => undefined)
            ).resolves.toBeUndefined();
        });

        it('rejects with a generic error when a transaction fails', async () => {
            const conn = await db.getDB();
            const tx: any = {
                objectStore: () => ({}),
                error: null,
            };
            vi.spyOn(conn, 'transaction').mockReturnValue(tx);
            const p = db.performTransaction('shelves', 'readwrite', () => {});
            await Promise.resolve();
            await Promise.resolve();
            tx.onerror();
            await expect(p).rejects.toThrow('Transaction error on shelves');
        });
    });

    describe('shelves', () => {
        it('caches and reads shelves', async () => {
            await offlineDb.cacheShelves([
                { id: 'a', name: 'A' } as any,
                { id: 'b', name: 'B' } as any,
            ]);
            const shelves = await offlineDb.getCachedShelves();
            expect(shelves.map((s) => s.id).sort()).toEqual(['a', 'b']);
        });

        it('handles empty shelf lists', async () => {
            await offlineDb.cacheShelves([]);
            expect(await offlineDb.getCachedShelves()).toEqual([]);
        });
    });

    describe('subjects', () => {
        it('caches subjects, filters deleted and by shelf', async () => {
            await offlineDb.cacheSubjects([
                makeSubject({ id: 's1', shelfId: 'x' }),
                makeSubject({ id: 's2', shelfId: 'y' }),
                makeSubject({ id: 's3', shelfId: 'x', isDeleted: true }),
            ] as any);
            const all = await offlineDb.getCachedSubjects();
            expect(all.map((s) => s.id).sort()).toEqual(['s1', 's2']);
            const byShelf = await offlineDb.getCachedSubjects('x');
            expect(byShelf.map((s) => s.id)).toEqual(['s1']);
        });

        it('gets a subject by id or null', async () => {
            await offlineDb.cacheSubjects([makeSubject()] as any);
            expect((await offlineDb.getCachedSubjectById('s1'))?.name).toBe(
                'Subj'
            );
            expect(await offlineDb.getCachedSubjectById('zzz')).toBeNull();
        });
    });

    describe('cards', () => {
        it('caches cards flagged as synced and excludes deleted', async () => {
            await offlineDb.cacheCards([
                makeCard({ id: 'c1' }),
                makeCard({ id: 'c2', isDeleted: true }),
                makeCard({ id: 'c3', subjectId: 'other' }),
            ] as any);
            const cards = await offlineDb.getCachedCardsBySubject('s1');
            expect(cards.map((c) => c.id)).toEqual(['c1']);
            expect(cards[0]._syncStatus).toBe('synced');
            expect(cards[0]._isOffline).toBe(false);
        });

        it('returns only due cards', async () => {
            const future = new Date(Date.now() + 86400000 * 10).toISOString();
            await offlineDb.cacheCards([
                makeCard({ id: 'due' }),
                makeCard({ id: 'later', dueDate: future }),
            ] as any);
            const due = await offlineDb.getCachedDueCardsBySubject('s1');
            expect(due.map((c) => c.id)).toEqual(['due']);
        });

        it('gets a card by id or null', async () => {
            await offlineDb.cacheCards([makeCard()] as any);
            expect((await offlineDb.getCachedCardById('c1'))?.front).toBe('F');
            expect(await offlineDb.getCachedCardById('nope')).toBeNull();
        });
    });

    describe('saveOfflineCard', () => {
        it('stores a trimmed card, bumps subject counts and queues sync', async () => {
            await offlineDb.cacheSubjects([makeSubject()] as any);
            const card = await offlineDb.saveOfflineCard('s1', {
                front: '  Q ',
                back: ' A  ',
                hint: ' h ',
                tags: ['t'],
                mediaUrl: 'u',
            });
            expect(card.id).toMatch(/^card-offline-/);
            expect(card).toMatchObject({
                front: 'Q',
                back: 'A',
                hint: 'h',
                tags: ['t'],
                _syncStatus: 'pending_create',
                _isOffline: true,
            });
            expect(await offlineDb.getCachedCardById(card.id)).toMatchObject({
                front: 'Q',
            });
            const subject = await offlineDb.getCachedSubjectById('s1');
            expect(subject?.cardCount).toBe(3);
            expect(subject?.dueCount).toBe(2);

            const actions = await offlineDb.getPendingSyncActions();
            expect(actions).toHaveLength(1);
            expect(actions[0].type).toBe('CREATE_CARD');
            expect(actions[0].payload).toMatchObject({
                tempId: card.id,
                subjectId: 's1',
                front: 'Q',
                mediaUrl: 'u',
            });
        });

        it('works without cached subject and with defaults', async () => {
            const card = await offlineDb.saveOfflineCard('missing', {
                front: 'a',
                back: 'b',
                hint: '  ',
            });
            expect(card.tags).toEqual([]);
            expect(card.hint).toBeUndefined();
            expect(await offlineDb.getCachedSubjectById('missing')).toBeNull();
        });

        it('defaults missing subject counters to zero', async () => {
            await offlineDb.cacheSubjects([
                makeSubject({ cardCount: undefined, dueCount: undefined }),
            ] as any);
            await offlineDb.saveOfflineCard('s1', { front: 'a', back: 'b' });
            const s = await offlineDb.getCachedSubjectById('s1');
            expect(s?.cardCount).toBe(1);
            expect(s?.dueCount).toBe(1);
        });

        it('survives failure of the subject update', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(offlineDb, 'getCachedSubjectById').mockRejectedValue(
                new Error('x')
            );
            const card = await offlineDb.saveOfflineCard('s1', {
                front: 'a',
                back: 'b',
            });
            expect(card.id).toBeTruthy();
            expect(warn).toHaveBeenCalled();
            expect(await offlineDb.getPendingSyncCount()).toBe(1);
        });
    });

    describe('saveOfflineBatchCards', () => {
        it('imports valid rows, parses string tags and updates subject', async () => {
            await offlineDb.cacheSubjects([makeSubject()] as any);
            const res = await offlineDb.saveOfflineBatchCards('s1', [
                { front: 'a', back: 'b', tags: ['x'] },
                { front: 'c', back: 'd', tags: ' Foo, BAR ,, ' as any },
                { front: 'e', back: 'f' },
                { front: '  ', back: 'x' },
                { front: 'x', back: '' },
            ]);
            expect(res.importedCount).toBe(3);
            expect(res.cards[0].tags).toEqual(['x']);
            expect(res.cards[1].tags).toEqual(['foo', 'bar']);
            expect(res.cards[2].tags).toEqual([]);

            const subject = await offlineDb.getCachedSubjectById('s1');
            expect(subject?.cardCount).toBe(5);
            expect(subject?.dueCount).toBe(4);

            const actions = await offlineDb.getPendingSyncActions();
            expect(actions[0].type).toBe('BATCH_CREATE_CARDS');
            expect(actions[0].payload.cards).toHaveLength(3);
            expect(actions[0].payload.cards[0].tempId).toBe(res.cards[0].id);
        });

        it('handles a missing subject and zero counters', async () => {
            const res = await offlineDb.saveOfflineBatchCards('none', [
                { front: 'a', back: 'b' },
            ]);
            expect(res.importedCount).toBe(1);

            await offlineDb.cacheSubjects([
                makeSubject({ cardCount: undefined, dueCount: undefined }),
            ] as any);
            await offlineDb.saveOfflineBatchCards('s1', [
                { front: 'a', back: 'b' },
            ]);
            expect(
                (await offlineDb.getCachedSubjectById('s1'))?.cardCount
            ).toBe(1);
        });
    });

    describe('saveOfflineCardReview', () => {
        it('grades a cached card, awards XP and queues sync', async () => {
            await offlineDb.cacheCards([makeCard()] as any);
            const res = await offlineDb.saveOfflineCardReview('c1', 3 as any, {
                shelfId: 'sh1',
                subjectId: 's1',
            });
            expect(res.xpGained).toBe(15);
            expect(res.totalXp).toBe(15);
            expect(res.card._syncStatus).toBe('pending_update');
            expect(res.card.lastReviewedAt).toBeTruthy();
            expect(res.card.dueDate).toBe(res.scheduled.dueDate);

            const stored = await offlineDb.getCachedCardById('c1');
            expect(stored?.repetitions).toBe(res.scheduled.repetitions);

            const second = await offlineDb.saveOfflineCardReview(
                'c1',
                4 as any
            );
            expect(second.xpGained).toBe(20);
            expect(second.totalXp).toBe(35);
            expect(await offlineDb.getMetadata('user_profile_xp')).toEqual({
                xp: 35,
            });

            const actions = await offlineDb.getPendingSyncActions();
            expect(actions.map((a) => a.type)).toEqual([
                'GRADE_CARD',
                'GRADE_CARD',
            ]);
            expect(actions.map((a) => a.payload.grade).sort()).toEqual([3, 4]);
            expect(
                actions.find((a) => a.payload.grade === 3)?.payload
            ).toMatchObject({
                cardId: 'c1',
                shelfId: 'sh1',
                subjectId: 's1',
            });
            expect(
                actions.find((a) => a.payload.grade === 4)?.payload.subjectId
            ).toBe('s1');
        });

        it.each([
            [2, 10],
            [1, 5],
        ])('awards xp for grade %i', async (grade, xp) => {
            await offlineDb.cacheCards([makeCard()] as any);
            const res = await offlineDb.saveOfflineCardReview(
                'c1',
                grade as any
            );
            expect(res.xpGained).toBe(xp);
        });

        it('uses a placeholder for uncached cards', async () => {
            const res = await offlineDb.saveOfflineCardReview(
                'ghost',
                3 as any
            );
            expect(res.card.subjectId).toBe('unknown');
            expect(res.card._syncStatus).toBe('pending_update');
        });

        it('keeps pending_create status for offline-created cards', async () => {
            const created = await offlineDb.saveOfflineCard('s1', {
                front: 'a',
                back: 'b',
            });
            const res = await offlineDb.saveOfflineCardReview(
                created.id,
                3 as any
            );
            expect(res.card._syncStatus).toBe('pending_create');
        });

        it('falls back when metadata fails', async () => {
            await offlineDb.cacheCards([makeCard()] as any);
            vi.spyOn(offlineDb, 'getMetadata').mockRejectedValue(
                new Error('x')
            );
            const res = await offlineDb.saveOfflineCardReview('c1', 3 as any);
            expect(res.totalXp).toBe(15);
        });
    });

    describe('saveOfflineCardUpdate', () => {
        it('returns null for unknown cards', async () => {
            expect(await offlineDb.saveOfflineCardUpdate('x', {})).toBeNull();
        });

        it('applies changes and queues an update', async () => {
            await offlineDb.cacheCards([makeCard({ hint: 'old' })] as any);
            const res = await offlineDb.saveOfflineCardUpdate('c1', {
                front: ' New ',
                back: ' Back ',
                hint: '  ',
                tags: ['z'],
                mediaUrl: 'm',
            });
            expect(res).toMatchObject({
                front: 'New',
                back: 'Back',
                hint: undefined,
                tags: ['z'],
                mediaUrl: 'm',
                _syncStatus: 'pending_update',
            });
            const actions = await offlineDb.getPendingSyncActions();
            expect(actions[0].type).toBe('UPDATE_CARD');
            expect(actions[0].payload.cardId).toBe('c1');
        });

        it('leaves untouched fields and keeps pending_create', async () => {
            const created = await offlineDb.saveOfflineCard('s1', {
                front: 'a',
                back: 'b',
            });
            const res = await offlineDb.saveOfflineCardUpdate(created.id, {});
            expect(res?.front).toBe('a');
            expect(res?._syncStatus).toBe('pending_create');
        });
    });

    describe('saveOfflineCardDelete', () => {
        it('returns false for unknown cards', async () => {
            expect(await offlineDb.saveOfflineCardDelete('x')).toBe(false);
        });

        it('soft-deletes, decrements count and queues deletion', async () => {
            await offlineDb.cacheSubjects([makeSubject()] as any);
            await offlineDb.cacheCards([makeCard()] as any);
            expect(await offlineDb.saveOfflineCardDelete('c1')).toBe(true);
            const stored = await offlineDb.getCachedCardById('c1');
            expect(stored?.isDeleted).toBe(true);
            expect(stored?._syncStatus).toBe('pending_delete');
            expect(
                (await offlineDb.getCachedSubjectById('s1'))?.cardCount
            ).toBe(1);
            expect((await offlineDb.getPendingSyncActions())[0].type).toBe(
                'DELETE_CARD'
            );
        });

        it('does not decrement below zero or without subject', async () => {
            await offlineDb.cacheSubjects([
                makeSubject({ cardCount: 0 }),
            ] as any);
            await offlineDb.cacheCards([
                makeCard(),
                makeCard({ id: 'c2', subjectId: 'nosubj' }),
            ] as any);
            await offlineDb.saveOfflineCardDelete('c1');
            await offlineDb.saveOfflineCardDelete('c2');
            expect(
                (await offlineDb.getCachedSubjectById('s1'))?.cardCount
            ).toBe(0);
        });

        it('survives subject lookup failure', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            await offlineDb.cacheCards([makeCard()] as any);
            vi.spyOn(offlineDb, 'getCachedSubjectById').mockRejectedValue(
                new Error('x')
            );
            expect(await offlineDb.saveOfflineCardDelete('c1')).toBe(true);
            expect(warn).toHaveBeenCalled();
        });
    });

    describe('sync queue', () => {
        it('enqueues, orders by createdAt, updates, removes and clears', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2025-01-02T00:00:00Z'));
            const later = await offlineDb.enqueueSyncAction('CREATE_SHELF', {
                n: 1,
            });
            vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
            const earlier = await offlineDb.enqueueSyncAction(
                'DELETE_SUBJECT',
                { n: 2 }
            );
            expect(later).toMatchObject({ status: 'pending', retryCount: 0 });

            const list = await offlineDb.getPendingSyncActions();
            expect(list.map((a) => a.id)).toEqual([earlier.id, later.id]);
            expect(await offlineDb.getPendingSyncCount()).toBe(2);

            await offlineDb.updateSyncAction(earlier.id, {
                status: 'failed',
                retryCount: 2,
                errorMessage: 'bad',
            });
            await offlineDb.updateSyncAction('missing', { status: 'failed' });
            const updated = (await offlineDb.getPendingSyncActions())[0];
            expect(updated).toMatchObject({
                status: 'failed',
                retryCount: 2,
                errorMessage: 'bad',
                type: 'DELETE_SUBJECT',
            });

            await offlineDb.removeSyncAction(earlier.id);
            expect(await offlineDb.getPendingSyncCount()).toBe(1);

            await offlineDb.clearSyncQueue();
            expect(await offlineDb.getPendingSyncCount()).toBe(0);
        });
    });

    describe('replaceTempCardId', () => {
        it('swaps the card and rewrites queued references', async () => {
            const created = await offlineDb.saveOfflineCard('s1', {
                front: 'a',
                back: 'b',
            });
            const tempId = created.id;
            await offlineDb.enqueueSyncAction('GRADE_CARD', { cardId: tempId });
            await offlineDb.enqueueSyncAction('UPDATE_CARD', {
                cardId: tempId,
            });
            await offlineDb.enqueueSyncAction('DELETE_CARD', {
                cardId: tempId,
            });
            await offlineDb.enqueueSyncAction('DELETE_CARD', {
                cardId: 'other',
            });
            await offlineDb.enqueueSyncAction('CREATE_SHELF', {
                cardId: tempId,
            });

            await offlineDb.replaceTempCardId(
                tempId,
                makeCard({ id: 'real-1', subjectId: 's1' }) as any
            );

            expect(await offlineDb.getCachedCardById(tempId)).toBeNull();
            const real = await offlineDb.getCachedCardById('real-1');
            expect(real?._syncStatus).toBe('synced');
            expect(real?._isOffline).toBe(false);

            const actions = await offlineDb.getPendingSyncActions();
            const byType = (t: string) =>
                actions
                    .filter((a) => a.type === t)
                    .map((a) => a.payload.cardId);
            expect(byType('GRADE_CARD')).toEqual(['real-1']);
            expect(byType('UPDATE_CARD')).toEqual(['real-1']);
            expect(byType('DELETE_CARD').sort()).toEqual(['other', 'real-1']);
            expect(byType('CREATE_SHELF')).toEqual([tempId]);
        });
    });

    describe('metadata', () => {
        it('stores and retrieves values, null when absent', async () => {
            expect(await offlineDb.getMetadata('k')).toBeNull();
            await offlineDb.setMetadata('k', { a: 1 });
            expect(await offlineDb.getMetadata('k')).toEqual({ a: 1 });
            await offlineDb.setMetadata('k', 'v');
            expect(await offlineDb.getMetadata('k')).toBe('v');
        });
    });
});
