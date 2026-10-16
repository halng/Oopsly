'use client';
import React from 'react';
import { Timer, X } from 'lucide-react';
import { formatClock } from '@/utils/study';

interface StudyHeaderProps {
    icon: React.ReactNode;
    iconClassName?: string;
    title: string;
    subtitle?: React.ReactNode;
    seconds?: number;
    extra?: React.ReactNode;
    onClose: () => void;
    closeTestId?: string;
}

export default function StudyHeader({
    icon,
    iconClassName = 'bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] text-[var(--theme-accent)]',
    title,
    subtitle,
    seconds,
    extra,
    onClose,
    closeTestId,
}: Readonly<StudyHeaderProps>) {
    return (
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--theme-border)]">
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClassName}`}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-bold truncate text-[var(--theme-text)]">
                        {title}
                    </h1>
                    {subtitle && (
                        <div className="text-xs text-[var(--theme-text)]/55">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {extra}
                {seconds !== undefined && (
                    <span
                        data-testid="study-timer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--theme-subtle)] font-mono text-xs font-bold text-[var(--theme-accent)]"
                    >
                        <Timer className="w-3.5 h-3.5" />
                        {formatClock(seconds)}
                    </span>
                )}
                <button
                    type="button"
                    data-testid={closeTestId}
                    aria-label="Close"
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-[var(--theme-subtle)] cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
