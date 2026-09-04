import { Card, Subject, Shelf, TestSuite, UserProfile, Grade } from '../types';
import { scheduleCard, ScheduleResult } from '../utils/fsrs';

const DB_NAME = 'oopsly-offline-db';
const DB_VERSION = 1;

export interface SyncAction {
  id: string;
  type:
    | 'CREATE_CARD'
    | 'BATCH_CREATE_CARDS'
    | 'GRADE_CARD'
    | 'UPDATE_CARD'
    | 'DELETE_CARD'
    | 'CREATE_SUBJECT'
    | 'UPDATE_SUBJECT'
    | 'DELETE_SUBJECT'
    | 'CREATE_SHELF';
  payload: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

export interface OfflineCard extends Card {
  _isOffline?: boolean;
  _syncStatus?: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
  _tempId?: string;
}

export interface OfflineSubject extends Subject {
  _isOffline?: boolean;
  _syncStatus?: 'synced' | 'pending_create' | 'pending_update';
}

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for Shelves
        if (!db.objectStoreNames.contains('shelves')) {
          db.createObjectStore('shelves', { keyPath: 'id' });
        }

        // Store for Subjects
        if (!db.objectStoreNames.contains('subjects')) {
          const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subjectStore.createIndex('shelfId', 'shelfId', { unique: false });
        }

        // Store for Cards
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('subjectId', 'subjectId', { unique: false });
          cardStore.createIndex('dueDate', 'dueDate', { unique: false });
          cardStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }

        // Store for Test Suites
        if (!db.objectStoreNames.contains('testSuites')) {
          const suiteStore = db.createObjectStore('testSuites', { keyPath: 'id' });
          suiteStore.createIndex('subjectId', 'subjectId', { unique: false });
        }

        // Store for Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store for General App Metadata / Profile / Cache
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // --- Generic Transaction Helpers ---

  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise<T>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result: any;

        const req = callback(store);
        if (req) {
          req.onsuccess = () => {
            result = req.result;
          };
        }

        tx.oncomplete = () => {
          resolve(result);
        };

        tx.onerror = () => {
          reject(tx.error || new Error(`Transaction error on ${storeName}`));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Shelves Caching ---

  async cacheShelves(shelves: Shelf[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shelves', 'readwrite');
      const store = tx.objectStore('shelves');
      shelves.forEach((s) => store.put(s));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedShelves(): Promise<Shelf[]> {
    return this.performTransaction<Shelf[]>('shelves', 'readonly', (store) => store.getAll());
  }

  // --- Subjects Caching ---

  async cacheSubjects(subjects: Subject[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('subjects', 'readwrite');
      const store = tx.objectStore('subjects');
      subjects.forEach((s) => store.put(s));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedSubjects(shelfId?: string): Promise<Subject[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('subjects', 'readonly');
      const store = tx.objectStore('subjects');
      let req: IDBRequest<Subject[]>;

      if (shelfId) {
        const index = store.index('shelfId');
        req = index.getAll(shelfId);
      } else {
        req = store.getAll();
      }

      req.onsuccess = () => {
        const active = (req.result || []).filter((s) => !s.isDeleted);
        resolve(active);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCachedSubjectById(id: string): Promise<Subject | null> {
    return this.performTransaction<Subject>('subjects', 'readonly', (store) => store.get(id)).then(
      (res) => res || null
    );
  }

  // --- Cards Caching & Retrieval ---

  async cacheCards(cards: Card[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cards', 'readwrite');
      const store = tx.objectStore('cards');
      cards.forEach((c) => {
        store.put({
          ...c,
          _syncStatus: 'synced',
          _isOffline: false,
        });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedCardsBySubject(subjectId: string): Promise<OfflineCard[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cards', 'readonly');
      const store = tx.objectStore('cards');
      const index = store.index('subjectId');
      const req = index.getAll(subjectId);

      req.onsuccess = () => {
        const validCards = (req.result || []).filter((c: OfflineCard) => !c.isDeleted);
        resolve(validCards);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCachedDueCardsBySubject(subjectId: string): Promise<OfflineCard[]> {
    const cards = await this.getCachedCardsBySubject(subjectId);
    const now = new Date();
    return cards.filter((c) => new Date(c.dueDate) <= now);
  }

  async getCachedCardById(id: string): Promise<OfflineCard | null> {
    return this.performTransaction<OfflineCard>('cards', 'readonly', (store) => store.get(id)).then(
      (res) => res || null
    );
  }

  // --- Offline Card Creation ---

  async saveOfflineCard(
    subjectId: string,
    data: { front: string; back: string; hint?: string; tags?: string[]; mediaUrl?: string }
  ): Promise<OfflineCard> {
    const tempId = `card-offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCard: OfflineCard = {
      id: tempId,
      subjectId,
      front: data.front.trim(),
      back: data.back.trim(),
      hint: data.hint?.trim() || undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
      difficulty: 3.0,
      stability: 0.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate: nowIso,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      mediaUrl: data.mediaUrl,
      _isOffline: true,
      _syncStatus: 'pending_create',
      _tempId: tempId,
    };

    // Store card in IndexedDB
    await this.performTransaction('cards', 'readwrite', (store) => store.put(newCard));

    // Update subject card count locally in IndexedDB
    try {
      const subject = await this.getCachedSubjectById(subjectId);
      if (subject) {
        subject.cardCount = (subject.cardCount || 0) + 1;
        subject.dueCount = (subject.dueCount || 0) + 1;
        await this.performTransaction('subjects', 'readwrite', (store) => store.put(subject));
      }
    } catch (err) {
      console.warn('Could not update cached subject count:', err);
    }

    // Enqueue sync action
    await this.enqueueSyncAction('CREATE_CARD', {
      tempId,
      subjectId,
      front: newCard.front,
      back: newCard.back,
      hint: newCard.hint,
      tags: newCard.tags,
      mediaUrl: newCard.mediaUrl,
    });

    return newCard;
  }

  // --- Offline Batch Card Creation ---

  async saveOfflineBatchCards(
    subjectId: string,
    importItems: Array<{ front: string; back: string; hint?: string; tags?: string[]; mediaUrl?: string }>
  ): Promise<{ importedCount: number; cards: OfflineCard[] }> {
    const nowIso = new Date().toISOString();
    const createdCards: OfflineCard[] = [];

    const db = await this.getDB();
    const tx = db.transaction(['cards', 'subjects'], 'readwrite');
    const cardStore = tx.objectStore('cards');
    const subjectStore = tx.objectStore('subjects');

    for (const item of importItems) {
      if (!item.front?.trim() || !item.back?.trim()) continue;

      const tempId = `card-offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const card: OfflineCard = {
        id: tempId,
        subjectId,
        front: item.front.trim(),
        back: item.back.trim(),
        hint: item.hint?.trim() || undefined,
        tags: Array.isArray(item.tags)
          ? item.tags
          : typeof item.tags === 'string'
          ? (item.tags as string).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : [],
        difficulty: 3.0,
        stability: 0.5,
        intervalDays: 0,
        repetitions: 0,
        dueDate: nowIso,
        isDeleted: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        mediaUrl: item.mediaUrl,
        _isOffline: true,
        _syncStatus: 'pending_create',
        _tempId: tempId,
      };

      cardStore.put(card);
      createdCards.push(card);
    }

    // Update subject card count
    const subjectReq = subjectStore.get(subjectId);
    subjectReq.onsuccess = () => {
      const subject = subjectReq.result;
      if (subject) {
        subject.cardCount = (subject.cardCount || 0) + createdCards.length;
        subject.dueCount = (subject.dueCount || 0) + createdCards.length;
        subjectStore.put(subject);
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Enqueue sync action
    await this.enqueueSyncAction('BATCH_CREATE_CARDS', {
      subjectId,
      cards: createdCards.map((c) => ({
        tempId: c.id,
        front: c.front,
        back: c.back,
        hint: c.hint,
        tags: c.tags,
        mediaUrl: c.mediaUrl,
      })),
    });

    return {
      importedCount: createdCards.length,
      cards: createdCards,
    };
  }

  // --- Offline Card Review & Grading (FSRS Algorithm) ---

  async saveOfflineCardReview(
    cardId: string,
    grade: Grade
  ): Promise<{ card: OfflineCard; scheduled: ScheduleResult; xpGained: number; totalXp: number }> {
    let card = await this.getCachedCardById(cardId);

    if (!card) {
      // Fallback placeholder if not cached yet
      card = {
        id: cardId,
        subjectId: 'unknown',
        front: '',
        back: '',
        tags: [],
        difficulty: 3.0,
        stability: 0.5,
        intervalDays: 0,
        repetitions: 0,
        dueDate: new Date().toISOString(),
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Calculate next FSRS intervals locally
    const scheduled = scheduleCard(
      {
        stability: card.stability,
        difficulty: card.difficulty,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
      },
      grade
    );

    const nowIso = new Date().toISOString();
    card.stability = scheduled.stability;
    card.difficulty = scheduled.difficulty;
    card.intervalDays = scheduled.intervalDays;
    card.repetitions = scheduled.repetitions;
    card.dueDate = scheduled.dueDate;
    card.lastReviewedAt = nowIso;
    card.updatedAt = nowIso;
    card._syncStatus = card._syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';

    await this.performTransaction('cards', 'readwrite', (store) => store.put(card!));

    const xpGained = grade === 4 ? 20 : grade === 3 ? 15 : grade === 2 ? 10 : 5;

    // Update offline metadata XP & stats
    let totalXp = 0;
    try {
      const meta = (await this.getMetadata<{ xp: number }>('user_profile_xp')) || { xp: 0 };
      totalXp = (meta.xp || 0) + xpGained;
      await this.setMetadata('user_profile_xp', { xp: totalXp });
    } catch {
      totalXp = xpGained;
    }

    // Enqueue sync action
    await this.enqueueSyncAction('GRADE_CARD', {
      cardId,
      grade,
      scheduled,
      timestamp: nowIso,
    });

    return {
      card,
      scheduled,
      xpGained,
      totalXp,
    };
  }

  // --- Offline Card Update / Delete ---

  async saveOfflineCardUpdate(cardId: string, data: Partial<Card>): Promise<OfflineCard | null> {
    const card = await this.getCachedCardById(cardId);
    if (!card) return null;

    if (data.front) card.front = data.front.trim();
    if (data.back) card.back = data.back.trim();
    if (data.hint !== undefined) card.hint = data.hint?.trim() || undefined;
    if (data.tags) card.tags = data.tags;
    if (data.mediaUrl !== undefined) card.mediaUrl = data.mediaUrl;
    card.updatedAt = new Date().toISOString();
    card._syncStatus = card._syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';

    await this.performTransaction('cards', 'readwrite', (store) => store.put(card));

    await this.enqueueSyncAction('UPDATE_CARD', {
      cardId,
      data,
    });

    return card;
  }

  async saveOfflineCardDelete(cardId: string): Promise<boolean> {
    const card = await this.getCachedCardById(cardId);
    if (!card) return false;

    card.isDeleted = true;
    card.updatedAt = new Date().toISOString();
    card._syncStatus = 'pending_delete';

    await this.performTransaction('cards', 'readwrite', (store) => store.put(card));

    // Decrement subject count
    try {
      const subject = await this.getCachedSubjectById(card.subjectId);
      if (subject && subject.cardCount > 0) {
        subject.cardCount -= 1;
        await this.performTransaction('subjects', 'readwrite', (store) => store.put(subject));
      }
    } catch (err) {
      console.warn('Could not decrement subject count:', err);
    }

    await this.enqueueSyncAction('DELETE_CARD', {
      cardId,
    });

    return true;
  }

  // --- Sync Queue Operations ---

  async enqueueSyncAction(type: SyncAction['type'], payload: any): Promise<SyncAction> {
    const action: SyncAction = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    await this.performTransaction('syncQueue', 'readwrite', (store) => store.put(action));
    return action;
  }

  async getPendingSyncActions(): Promise<SyncAction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const req = store.getAll();

      req.onsuccess = () => {
        const all: SyncAction[] = req.result || [];
        all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async removeSyncAction(id: string): Promise<void> {
    await this.performTransaction('syncQueue', 'readwrite', (store) => store.delete(id));
  }

  async updateSyncAction(id: string, updates: Partial<SyncAction>): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result) {
          const updated = { ...req.result, ...updates };
          store.put(updated);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSyncCount(): Promise<number> {
    const actions = await this.getPendingSyncActions();
    return actions.length;
  }

  async clearSyncQueue(): Promise<void> {
    await this.performTransaction('syncQueue', 'readwrite', (store) => store.clear());
  }

  // --- Replace Temp ID when card synced to server ---

  async replaceTempCardId(tempId: string, realCard: Card): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['cards', 'syncQueue'], 'readwrite');
    const cardStore = tx.objectStore('cards');
    const queueStore = tx.objectStore('syncQueue');

    // Remove temp card and insert real card
    cardStore.delete(tempId);
    cardStore.put({
      ...realCard,
      _syncStatus: 'synced',
      _isOffline: false,
    });

    // Update any remaining queued actions that referenced tempId
    const queueReq = queueStore.getAll();
    queueReq.onsuccess = () => {
      const actions: SyncAction[] = queueReq.result || [];
      actions.forEach((act) => {
        let changed = false;
        if (act.type === 'GRADE_CARD' && act.payload.cardId === tempId) {
          act.payload.cardId = realCard.id;
          changed = true;
        } else if (act.type === 'UPDATE_CARD' && act.payload.cardId === tempId) {
          act.payload.cardId = realCard.id;
          changed = true;
        } else if (act.type === 'DELETE_CARD' && act.payload.cardId === tempId) {
          act.payload.cardId = realCard.id;
          changed = true;
        }
        if (changed) {
          queueStore.put(act);
        }
      });
    };

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- App Metadata Storage ---

  async setMetadata(key: string, value: any): Promise<void> {
    await this.performTransaction('metadata', 'readwrite', (store) =>
      store.put({ key, value, updatedAt: new Date().toISOString() })
    );
  }

  async getMetadata<T = any>(key: string): Promise<T | null> {
    const item = await this.performTransaction<{ key: string; value: T }>('metadata', 'readonly', (store) =>
      store.get(key)
    );
    return item ? item.value : null;
  }
}

export const offlineDb = new OfflineDatabase();
