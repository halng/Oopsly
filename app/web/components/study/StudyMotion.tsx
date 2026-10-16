'use client';
import React from 'react';

export type StudyFx = 'enter' | 'fade' | 'shake' | 'pop' | 'glow' | 'none';

const FX_CLASS: Record<StudyFx, string> = {
    enter: 'study-enter',
    fade: 'study-fade',
    shake: 'study-shake',
    pop: 'study-pop',
    glow: 'study-glow',
    none: '',
};

interface StudyMotionProps {
    fx?: StudyFx;
    className?: string;
    testId?: string;
    children: React.ReactNode;
}

export default function StudyMotion({
    fx = 'enter',
    className = '',
    testId = 'study-motion',
    children,
}: Readonly<StudyMotionProps>) {
    return (
        <div
            data-testid={testId}
            className={`${FX_CLASS[fx]} ${className}`.trim()}
        >
            {children}
        </div>
    );
}
