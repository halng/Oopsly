import { describe, expect, it } from 'vitest';
import {
    clampDifficulty,
    formatInterval,
    initDifficulty,
    nextDifficulty,
    recallStability,
    retrievability,
    scheduleCard,
} from '@/utils/fsrs';

describe('fsrs utilities', () => {
    it('clamps difficulty and formats all interval units', () => {
        expect(clampDifficulty(-1)).toBe(1);
        expect(clampDifficulty(11)).toBe(10);
        expect(clampDifficulty(5)).toBe(5);
        expect(formatInterval(0)).toBe('< 10m');
        expect(formatInterval(1)).toBe('1d');
        expect(formatInterval(10)).toBe('10d');
        expect(formatInterval(60)).toBe('2mo');
        expect(formatInterval(365)).toBe('1.0y');
    });

    it('calculates bounded difficulty and retrievability values', () => {
        expect(initDifficulty(1)).toBeGreaterThanOrEqual(1);
        expect(initDifficulty(4)).toBeLessThanOrEqual(10);
        expect(nextDifficulty(5, 1)).toBeGreaterThan(5);
        expect(nextDifficulty(5, 4)).toBeLessThan(5);
        expect(retrievability(0, 2)).toBe(1);
        expect(retrievability(10, 2)).toBeLessThan(1);
        expect(recallStability(5, 0, 0.5, 2)).toBeGreaterThanOrEqual(0.1);
    });

    it('schedules new cards for again and successful grades', () => {
        const card = {
            stability: 0,
            difficulty: 5,
            intervalDays: 0,
            repetitions: 0,
        };
        const again = scheduleCard(card, 1);
        expect(again.intervalDays).toBe(0);
        expect(again.repetitions).toBe(0);
        expect(new Date(again.dueDate).getTime()).toBeGreaterThan(Date.now());

        const good = scheduleCard(card, 3);
        expect(good.intervalDays).toBeGreaterThanOrEqual(1);
        expect(good.repetitions).toBe(1);
    });

    it('handles review again and recall branches', () => {
        const card = {
            stability: 5,
            difficulty: 5,
            intervalDays: 4,
            repetitions: 2,
        };
        const again = scheduleCard(card, 1);
        const hard = scheduleCard(card, 2);
        const easy = scheduleCard(card, 4);
        expect(again.repetitions).toBe(0);
        expect(again.intervalDays).toBe(0);
        expect(hard.repetitions).toBe(3);
        expect(easy.repetitions).toBe(3);
        expect(hard.difficulty).not.toBe(easy.difficulty);
    });
});
