'use client';
import React from 'react';
import { Sparkles } from 'lucide-react';
import StudyConfetti from './StudyConfetti';

export interface StudyStat {
    label: string;
    value: React.ReactNode;
}

interface StudyResultCardProps {
    icon?: React.ReactNode;
    title: string;
    description?: React.ReactNode;
    xpGained?: number | null;
    stats?: StudyStat[];
    actions?: React.ReactNode;
    testId?: string;
}

export default function StudyResultCard({
    icon,
    title,
    description,
    xpGained,
    stats = [],
    actions,
    testId,
}: Readonly<StudyResultCardProps>) {
    return (
        <div
            data-testid={testId}
            className="study-fade py-8 text-center space-y-4"
        >
            <StudyConfetti />
            <div className="mx-auto w-fit study-pop">
                {icon ?? (
                    <Sparkles className="w-8 h-8 text-[var(--theme-accent)]" />
                )}
            </div>
            <h2 className="text-2xl font-black text-[var(--theme-text)]">
                {title}
            </h2>
            {description && (
                <p className="text-sm text-[var(--theme-text)]/55">
                    {description}
                </p>
            )}
            {xpGained !== undefined && xpGained !== null && (
                <p
                    data-testid="study-result-xp"
                    className="inline-flex items-center gap-1 text-sm font-bold text-[var(--theme-secondary)]"
                >
                    <Sparkles className="w-4 h-4" />+{xpGained} XP
                </p>
            )}
            {stats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="p-3 rounded-2xl bg-[var(--theme-subtle)] border border-[var(--theme-border)]"
                        >
                            <div className="font-black text-[var(--theme-text)]">
                                {s.value}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-[var(--theme-text)]/50">
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {actions && (
                <div className="flex flex-wrap justify-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
