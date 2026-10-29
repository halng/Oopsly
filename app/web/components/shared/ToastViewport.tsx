'use client';
import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Toast, ToastKind, useToastStore } from '@/store/ToastStore';

const SUCCESS_MS = 3500;
const INFO_MS = 5000;
const ERROR_MS = 8000;

const STYLES: Record<
    ToastKind,
    { box: string; icon: React.ReactNode; ms: number }
> = {
    success: {
        box: 'border-emerald-200 dark:border-emerald-800',
        icon: (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ),
        ms: SUCCESS_MS,
    },
    error: {
        box: 'border-rose-200 dark:border-rose-800',
        icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
        ms: ERROR_MS,
    },
    info: {
        box: 'border-stone-200 dark:border-stone-700',
        icon: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
        ms: INFO_MS,
    },
};

function ToastItem({ toast }: Readonly<{ toast: Toast }>) {
    const dismiss = useToastStore((s) => s.dismiss);
    const { box, icon, ms } = STYLES[toast.kind];

    useEffect(() => {
        const timer = setTimeout(() => dismiss(toast.id), ms);
        return () => clearTimeout(timer);
    }, [toast.id, ms, dismiss]);

    return (
        <div
            data-testid={`toast-${toast.kind}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2.5 w-full sm:w-96 p-3 rounded-xl border bg-white dark:bg-stone-900 shadow-lg text-xs ${box}`}
        >
            {icon}
            <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 dark:text-stone-100">
                    {toast.title}
                </p>
                {toast.description && (
                    <p className="mt-0.5 text-stone-600 dark:text-stone-400 leading-relaxed">
                        {toast.description}
                    </p>
                )}
            </div>
            <button
                type="button"
                aria-label="Dismiss notification"
                data-testid="btn-toast-dismiss"
                onClick={() => dismiss(toast.id)}
                className="p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default function ToastViewport() {
    const toasts = useToastStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    return (
        <div
            data-testid="toast-viewport"
            className="pointer-events-none fixed z-[100] bottom-20 md:bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 flex flex-col items-stretch sm:items-end gap-2"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} />
            ))}
        </div>
    );
}
