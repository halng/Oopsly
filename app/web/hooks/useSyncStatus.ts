'use client';
import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '../services/syncManager';

const idleStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
    syncedCountInLastRun: 0,
};

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>(idleStatus);

    useEffect(() => {
        syncManager.captureBrowserOnline();
        const unsubscribe = syncManager.subscribe((newStatus) => {
            setStatus(newStatus);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const syncNow = async () => {
        return syncManager.syncNow();
    };

    return {
        ...status,
        syncNow,
    };
}
