export const CONFETTI_COLORS = [
    '#5b8c32',
    '#3f6423',
    '#f4c430',
    '#fb7185',
    '#38bdf8',
    '#a78bfa',
    '#fb923c',
] as const;

export type ConfettiOrigin = 'top' | 'left' | 'right';

export interface ConfettiPiece {
    id: number;
    left: string;
    delay: string;
    duration: string;
    color: string;
    width: number;
    height: number;
    drift: string;
    rotate: string;
    origin: ConfettiOrigin;
}

export function prefersReducedMotion(): boolean {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function buildConfettiPieces(count = 72): ConfettiPiece[] {
    return Array.from({ length: count }, (_, i) => {
        const origin: ConfettiOrigin =
            i % 5 === 0 ? 'left' : i % 5 === 1 ? 'right' : 'top';
        return {
            id: i,
            left:
                origin === 'top'
                    ? `${(i * 17) % 100}%`
                    : origin === 'left'
                      ? '8%'
                      : '92%',
            delay: `${(i % 12) * 0.05}s`,
            duration: `${2.2 + (i % 6) * 0.22}s`,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            width: 8 + (i % 6),
            height: 10 + (i % 5) * 2,
            drift: `${(i % 2 === 0 ? -1 : 1) * (40 + (i % 8) * 16)}px`,
            rotate: `${420 + (i % 4) * 180}deg`,
            origin,
        };
    });
}

export const CONFETTI_PIECES = buildConfettiPieces();
