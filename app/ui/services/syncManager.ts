import { offlineDb, SyncAction } from './offlineDb';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  lastError: string | null;
  syncedCountInLastRun: number;
}

type SyncListener = (status: SyncStatus) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
    syncedCountInLastRun: 0,
  };
  private isInitialized = false;
  private syncTimeout: any = null;

  constructor() {
    // Singleton
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Listen to browser online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Listen to custom Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_TRIGGERED_FROM_SW') {
          this.syncNow();
        }
      });
    }

    // Initial check of pending queue count
    this.refreshPendingCount();

    // Check online status with real heartbeat
    this.checkConnection();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener({ ...this.status });
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  public async refreshPendingCount(): Promise<number> {
    try {
      const count = await offlineDb.getPendingSyncCount();
      this.status.pendingCount = count;
      this.notify();
      return count;
    } catch {
      return 0;
    }
  }

  private async handleNetworkChange(isOnline: boolean) {
    this.status.isOnline = isOnline;
    this.notify();

    if (isOnline) {
      // Check actual server availability and then sync
      const reachable = await this.checkConnection();
      if (reachable) {
        // Debounce slightly to let network stabilize
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.syncNow();
        }, 800);
      }
    }
  }

  public async checkConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status.isOnline = false;
      this.notify();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const isHealthy = res.ok;
      this.status.isOnline = isHealthy;
      this.notify();
      return isHealthy;
    } catch {
      this.status.isOnline = false;
      this.notify();
      return false;
    }
  }

  /**
   * Triggers Service Worker Background Sync registration if supported
   */
  public async requestBackgroundSync() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore
        if (registration.sync) {
          // @ts-ignore
          await registration.sync.register('sync-oopsly-reviews');
        }
      } catch (err) {
        console.warn('Background sync registration not available:', err);
      }
    }
  }

  /**
   * Drain the IndexedDB sync queue by replaying mutations against the server
   */
  public async syncNow(): Promise<{ success: number; failed: number }> {
    if (this.status.isSyncing) {
      return { success: 0, failed: 0 };
    }

    const count = await this.refreshPendingCount();
    if (count === 0) {
      return { success: 0, failed: 0 };
    }

    // Verify connectivity before syncing
    const isOnline = await this.checkConnection();
    if (!isOnline) {
      return { success: 0, failed: count };
    }

    this.status.isSyncing = true;
    this.status.lastError = null;
    this.notify();

    let successCount = 0;
    let failedCount = 0;

    try {
      const actions = await offlineDb.getPendingSyncActions();

      for (const action of actions) {
        try {
          await offlineDb.updateSyncAction(action.id, { status: 'syncing' });
          const success = await this.processAction(action);

          if (success) {
            await offlineDb.removeSyncAction(action.id);
            successCount++;
          } else {
            failedCount++;
            await offlineDb.updateSyncAction(action.id, {
              status: 'failed',
              retryCount: (action.retryCount || 0) + 1,
            });
          }
        } catch (actionErr: any) {
          failedCount++;
          await offlineDb.updateSyncAction(action.id, {
            status: 'failed',
            retryCount: (action.retryCount || 0) + 1,
            errorMessage: actionErr?.message || 'Sync failed',
          });
        }
      }

      this.status.lastSyncTime = new Date();
      this.status.syncedCountInLastRun = successCount;
      await this.refreshPendingCount();

      // Broadcast sync completion event to UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('oopsly-sync-completed', {
            detail: { successCount, failedCount, timestamp: new Date() },
          })
        );
      }
    } catch (err: any) {
      console.error('Fatal error during syncNow:', err);
      this.status.lastError = err?.message || 'Synchronization failed';
    } finally {
      this.status.isSyncing = false;
      this.notify();
    }

    return { success: successCount, failed: failedCount };
  }

  private async processAction(action: SyncAction): Promise<boolean> {
    const { type, payload } = action;

    switch (type) {
      case 'CREATE_CARD': {
        const { tempId, subjectId, front, back, hint, tags, mediaUrl } = payload;
        const res = await fetch(`/api/subjects/${subjectId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ front, back, hint, tags, mediaUrl }),
        });

        if (!res.ok) return false;
        const data = await res.json();
        if (data.isSuccess && data.data) {
          // Replace tempId with server created card in local IndexedDB
          await offlineDb.replaceTempCardId(tempId, data.data);
          return true;
        }
        return false;
      }

      case 'BATCH_CREATE_CARDS': {
        const { subjectId, cards } = payload;
        const res = await fetch(`/api/subjects/${subjectId}/cards/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards: cards.map((c: any) => ({
              front: c.front,
              back: c.back,
              hint: c.hint,
              tags: c.tags,
              mediaUrl: c.mediaUrl,
            })),
          }),
        });

        if (!res.ok) return false;
        const data = await res.json();
        if (data.isSuccess && data.data?.cards) {
          // Update local IndexedDB cards
          await offlineDb.cacheCards(data.data.cards);
          return true;
        }
        return false;
      }

      case 'GRADE_CARD': {
        const { cardId, grade } = payload;
        const res = await fetch(`/api/cards/${cardId}/difficulty`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade }),
        });

        if (!res.ok) return false;
        const data = await res.json();
        if (data.isSuccess && data.data?.card) {
          // Update local card with server state
          await offlineDb.cacheCards([data.data.card]);
          return true;
        }
        return false;
      }

      case 'UPDATE_CARD': {
        const { cardId, data: cardData } = payload;
        const res = await fetch(`/api/cards/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardData),
        });

        if (!res.ok) return false;
        const data = await res.json();
        if (data.isSuccess && data.data) {
          await offlineDb.cacheCards([data.data]);
          return true;
        }
        return false;
      }

      case 'DELETE_CARD': {
        const { cardId } = payload;
        const res = await fetch(`/api/cards/${cardId}/delete`, {
          method: 'PATCH',
        });

        return res.ok;
      }

      default:
        console.warn(`Unknown sync action type: ${type}`);
        return true;
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }
}

export const syncManager = new SyncManager();
