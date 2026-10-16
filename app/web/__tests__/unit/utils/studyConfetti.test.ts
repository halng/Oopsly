import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    CONFETTI_COLORS,
    CONFETTI_PIECES,
    buildConfettiPieces,
    prefersReducedMotion,
} from '@/utils/studyConfetti';

describe('studyConfetti', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('builds a mix of top and side bursts with theme colors', () => {
        const pieces = buildConfettiPieces(10);
        expect(pieces).toHaveLength(10);
        expect(pieces.map((p) => p.origin)).toEqual([
            'left',
            'right',
            'top',
            'top',
            'top',
            'left',
            'right',
            'top',
            'top',
            'top',
        ]);
        expect(CONFETTI_COLORS).toContain(pieces[0].color);
        expect(CONFETTI_PIECES.length).toBeGreaterThan(20);
        expect(pieces[2].left).toMatch(/%$/);
        expect(pieces[0].left).toBe('8%');
        expect(pieces[1].left).toBe('92%');
    });

    it('detects reduced motion and missing matchMedia', () => {
        expect(prefersReducedMotion()).toBe(false);

        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: true,
                addListener: vi.fn(),
                removeListener: vi.fn(),
            })
        );
        expect(prefersReducedMotion()).toBe(true);

        vi.stubGlobal('matchMedia', undefined);
        expect(prefersReducedMotion()).toBe(false);
    });
});
