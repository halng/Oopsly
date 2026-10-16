'use client';
import React from 'react';

interface StudyShellProps {
    testId: string;
    className?: string;
    children: React.ReactNode;
}

export default function StudyShell({
    testId,
    className = '',
    children,
}: Readonly<StudyShellProps>) {
    return (
        <div
            data-testid={testId}
            className={`bg-[var(--theme-card)] text-[var(--theme-text)] rounded-3xl border border-[var(--theme-border)] shadow-sm shadow-[color-mix(in_srgb,var(--theme-text)_6%,transparent)] ${className}`.trim()}
        >
            {children}
        </div>
    );
}
