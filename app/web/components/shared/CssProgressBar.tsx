'use client';
import React from 'react';

interface CssProgressBarProps {
    mastered: number;
    total: number;
    color?: string;
}

export default function CssProgressBar({
    mastered,
    total,
    color = 'var(--theme-accent)',
}: CssProgressBarProps) {
    const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return (
        <div
            data-testid="css-progress-bar"
            className="flex items-center gap-2 min-w-[120px]"
            title={`${mastered}/${total} mastered`}
        >
            <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                {percent}%
            </span>
        </div>
    );
}
