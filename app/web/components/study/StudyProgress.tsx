'use client';
import React from 'react';

export interface StudyProgressSegment {
    width: number;
    className?: string;
    testId?: string;
}

interface StudyProgressProps {
    segments: StudyProgressSegment[];
    testId?: string;
}

export default function StudyProgress({
    segments,
    testId = 'study-progress',
}: Readonly<StudyProgressProps>) {
    return (
        <div
            data-testid={testId}
            className="h-2 bg-[var(--theme-subtle)] rounded-full overflow-hidden flex"
        >
            {segments
                .filter((s) => s.width > 0)
                .map((s, i) => (
                    <div
                        key={s.testId ?? `${s.width}-${i}`}
                        data-testid={s.testId}
                        className={`h-full transition-all duration-500 ${s.className ?? 'bg-[var(--theme-accent)]'}`}
                        style={{ width: `${Math.min(s.width, 100)}%` }}
                    />
                ))}
        </div>
    );
}
