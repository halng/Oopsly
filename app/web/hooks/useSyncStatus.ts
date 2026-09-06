'use client';
import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '../services/syncManager';

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>(() =>
        syncManager.getStatus()
    );

    useEffect(() => {
        // Subscribe to syncManager updates
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
