import { describe, expect, it } from 'vitest';
import {
    formatClock,
    isAnswerCloseEnough,
    levenshtein,
    normalizeAnswer,
    pickDistractors,
    shuffle,
} from '@/utils/study';
import { card } from '@/__tests__/unit/helpers/studyFixtures';

describe('study utils', () => {
    it('shuffles with a deterministic RNG', () => {
        const seq = [0.9, 0.1, 0.5];
        const random = () => seq.shift() ?? 0;
        expect(shuffle([1, 2, 3], random)).toEqual([2, 1, 3]);
    });

    it('picks unique distractor backs that are not the correct answer', () => {
        const target = card({ id: 'a', back: 'Paris' });
        const pool = [
            target,
            card({ id: 'b', back: 'London' }),
            card({ id: 'c', back: 'paris' }),
            card({ id: 'd', back: 'Rome' }),
            card({ id: 'e', back: 'London' }),
        ];
        const picks = pickDistractors(target, pool, 3, () => 0);
        expect(picks).toEqual(['London', 'Rome']);
    });

    it('normalizes whitespace and case, and grades typed answers with a 15% typo allowance', () => {
        expect(normalizeAnswer('  Hello   World  ')).toBe('hello world');
        expect(normalizeAnswer('Hello', true)).toBe('Hello');
        expect(levenshtein('kitten', 'sitting')).toBe(3);
        expect(isAnswerCloseEnough('mitochondria', 'mitochondria')).toBe(true);
        expect(isAnswerCloseEnough('mitocondria', 'mitochondria')).toBe(true);
        expect(isAnswerCloseEnough('powerhouse', 'mitochondria')).toBe(false);
        expect(isAnswerCloseEnough('', 'a')).toBe(false);
        expect(isAnswerCloseEnough('A', 'a', true)).toBe(false);
    });

    it('formats a clock as mm:ss', () => {
        expect(formatClock(0)).toBe('00:00');
        expect(formatClock(75)).toBe('01:15');
        expect(formatClock(-3)).toBe('00:00');
    });
});
