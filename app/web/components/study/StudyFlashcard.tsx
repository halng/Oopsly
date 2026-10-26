'use client';
import React, { useState } from 'react';
import { FlipVertical2 } from 'lucide-react';

interface StudyFlashcardProps {
    front: React.ReactNode;
    back: React.ReactNode;
    flipped: boolean;
    onFlip: () => void;
    toolbar?: React.ReactNode;
    frontExtra?: React.ReactNode;
    testId?: string;
}

export default function StudyFlashcard({
    front,
    back,
    flipped,
    onFlip,
    toolbar,
    frontExtra,
    testId = 'flashcard-box',
}: Readonly<StudyFlashcardProps>) {
    // The unflip animation must not play on first paint, only after a flip.
    const [hasFlipped, setHasFlipped] = useState(flipped);
    if (flipped && !hasFlipped) setHasFlipped(true);
    const turn = flipped ? 'is-flipped' : hasFlipped ? 'is-unflipped' : '';

    return (
        <div className="relative">
            {toolbar && (
                <div className="absolute top-4 right-4 z-10">{toolbar}</div>
            )}
            <div
                role="button"
                tabIndex={0}
                data-testid={testId}
                aria-pressed={flipped}
                onClick={onFlip}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onFlip();
                    }
                }}
                className="study-flip-scene w-full cursor-pointer"
            >
                <div
                    className={`study-flip-inner min-h-[280px] sm:min-h-[320px] ${turn}`}
                >
                    <div
                        aria-hidden={flipped}
                        className="study-flip-face study-flip-front rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-subtle)] p-6 sm:p-8 text-center shadow-sm"
                    >
                        <span className="inline-flex items-center rounded-full bg-[var(--theme-card)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--theme-text)]/45">
                            Prompt
                        </span>
                        <p className="mt-8 text-2xl sm:text-3xl font-black whitespace-pre-wrap text-[var(--theme-text)]">
                            {front}
                        </p>
                        {frontExtra}
                        <div
                            data-testid="flashcard-flip-hint"
                            className="mt-auto pt-8 text-xs font-semibold text-[var(--theme-text)]/40 flex items-center justify-center gap-1.5"
                        >
                            <FlipVertical2 className="w-3.5 h-3.5" />
                            Tap or press Space to flip
                        </div>
                    </div>
                    <div
                        aria-hidden={!flipped}
                        className="study-flip-face study-flip-back rounded-3xl border border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_10%,var(--theme-card))] p-6 sm:p-8 text-center shadow-sm"
                    >
                        <span className="inline-flex items-center rounded-full bg-[var(--theme-card)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--theme-accent)]">
                            Answer
                        </span>
                        <p
                            data-testid="flashcard-answer"
                            className="mt-8 text-xl sm:text-2xl font-bold whitespace-pre-wrap text-[var(--theme-secondary)]"
                        >
                            {back}
                        </p>
                        <div className="mt-auto pt-8 text-xs font-semibold text-[var(--theme-text)]/40 flex items-center justify-center gap-1.5">
                            <FlipVertical2 className="w-3.5 h-3.5" />
                            Tap to flip back
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
