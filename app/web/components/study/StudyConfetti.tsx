'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONFETTI_PIECES, prefersReducedMotion } from '@/utils/studyConfetti';

export const CONFETTI_MS = 4000;

export default function StudyConfetti() {
    const [show, setShow] = useState(() => !prefersReducedMotion());

    useEffect(() => {
        if (!show) return;
        const id = window.setTimeout(() => setShow(false), CONFETTI_MS);
        return () => window.clearTimeout(id);
    }, [show]);

    if (!show || typeof document === 'undefined') return null;

    return createPortal(
        <div
            data-testid="study-confetti"
            className="study-confetti"
            aria-hidden
        >
            {CONFETTI_PIECES.map((piece) => (
                <span
                    key={piece.id}
                    className={`study-confetti-piece from-${piece.origin}${
                        piece.id % 4 === 0 ? ' is-round' : ''
                    }`}
                    style={
                        {
                            left:
                                piece.origin === 'right'
                                    ? undefined
                                    : piece.left,
                            width: piece.width,
                            height: piece.height,
                            background: piece.color,
                            animationDelay: piece.delay,
                            animationDuration: piece.duration,
                            '--drift': piece.drift,
                            '--spin': piece.rotate,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>,
        document.body
    );
}
