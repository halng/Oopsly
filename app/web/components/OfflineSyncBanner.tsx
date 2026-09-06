'use client';
import React, { useState, useEffect } from 'react';
import {
    Wifi,
    WifiOff,
    RefreshCw,
    CheckCircle2,
    Database,
    CloudOff,
    Cloud,
    AlertCircle,
    X,
} from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

interface OfflineSyncBannerProps {
    onDataSynced?: () => void;
}

export default function OfflineSyncBanner({
    onDataSynced,
}: OfflineSyncBannerProps) {
    const {
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        lastError,
        syncNow,
    } = useSyncStatus();
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [justSyncedCount, setJustSyncedCount] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const handleSyncComplete = (e: any) => {
            const { successCount } = e.detail || {};
            if (successCount && successCount > 0) {
                setJustSyncedCount(successCount);
                setShowSuccessToast(true);
                if (onDataSynced) onDataSynced();

                const timer = setTimeout(() => {
                    setShowSuccessToast(false);
                }, 4000);
                return () => clearTimeout(timer);
            }
        };

        window.addEventListener('oopsly-sync-completed', handleSyncComplete);
        return () =>
            window.removeEventListener(
                'oopsly-sync-completed',
                handleSyncComplete
            );
    }, [onDataSynced]);

    // Reset dismissal if offline state changes
    useEffect(() => {
        if (!isOnline || pendingCount > 0) {
            setIsDismissed(false);
        }
    }, [isOnline, pendingCount]);

    if (isOnline && pendingCount === 0 && !showSuccessToast && !isSyncing) {
        return null;
    }

    if (isDismissed && !showSuccessToast && !isSyncing) {
        return null;
    }

    return (
        <div
            id="offline-sync-container"
            className="fixed bottom-20 md:bottom-5 right-4 z-40 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
            {/* Success Toast Notification */}
            {showSuccessToast && (
                <div
                    id="sync-success-toast"
                    className="mb-2 p-3 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center gap-3 border border-emerald-500"
                >
                    <div className="p-1.5 rounded-xl bg-white/20 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                        <p className="font-bold">Sync Completed!</p>
                        <p className="text-emerald-100">
                            {justSyncedCount}{' '}
                            {justSyncedCount === 1 ? 'change' : 'changes'}{' '}
                            successfully synced to cloud.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSuccessToast(false)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white/80"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Offline or Pending Changes Banner */}
            {(!isOnline || pendingCount > 0 || isSyncing) && (
                <div
                    id="offline-status-card"
                    className={`p-3.5 rounded-2xl shadow-xl backdrop-blur-md border transition-all ${
                        !isOnline
                            ? 'bg-amber-500/95 text-white border-amber-400/80 shadow-amber-900/20'
                            : isSyncing
                              ? 'bg-stone-900/95 text-white border-stone-700 shadow-stone-950/30'
                              : 'bg-stone-900/95 text-white border-stone-800'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <div
                                className={`p-2 rounded-xl shrink-0 ${
                                    !isOnline
                                        ? 'bg-amber-600'
                                        : 'bg-stone-800 text-[var(--theme-accent)]'
                                }`}
                            >
                                {!isOnline ? (
                                    <WifiOff className="w-4 h-4" />
                                ) : isSyncing ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--theme-accent)]" />
                                ) : (
                                    <Database className="w-4 h-4 text-[var(--theme-accent)]" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs">
                                        {!isOnline
                                            ? 'Offline Mode'
                                            : isSyncing
                                              ? 'Syncing to Cloud...'
                                              : 'Pending Sync'}
                                    </span>
                                    {pendingCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                                            {pendingCount}{' '}
                                            {pendingCount === 1
                                                ? 'item'
                                                : 'items'}
                                        </span>
                                    )}
                                </div>

                                <p className="text-[11px] text-white/85 mt-0.5 leading-snug">
                                    {!isOnline
                                        ? 'Cards & reviews are safely stored in IndexedDB. They will auto-sync when connection returns.'
                                        : isSyncing
                                          ? 'Replaying offline review grades & card creations...'
                                          : `${pendingCount} offline actions saved locally. Click Sync to upload.`}
                                </p>

                                {lastError && (
                                    <p className="text-[10px] text-rose-200 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        <span>{lastError}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsDismissed(true)}
                            className="p-1 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                            title="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Action Row */}
                    <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-[11px]">
                        <span className="text-white/70">
                            {lastSyncTime
                                ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : 'IndexedDB ready'}
                        </span>

                        <button
                            id="btn-sync-now-banner"
                            data-testid="btn-sync-now"
                            onClick={() => syncNow()}
                            disabled={isSyncing}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                !isOnline
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-[var(--theme-accent)] text-stone-950 hover:bg-[#9CCC65] shadow-xs'
                            } disabled:opacity-50`}
                        >
                            <RefreshCw
                                className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                            <span>
                                {isSyncing
                                    ? 'Syncing...'
                                    : isOnline
                                      ? 'Sync Now'
                                      : 'Retry'}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
