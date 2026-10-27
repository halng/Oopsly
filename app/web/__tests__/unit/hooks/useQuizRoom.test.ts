import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizRoom, useRemaining } from '@/hooks/useQuizRoom';
import { roomView } from '../helpers/quizFixtures';

type Opts = {
    onView: (v: unknown) => void;
    onEvent: (e: unknown) => void;
    onStatus: (s: string) => void;
};
let opts: Opts;
const conn = {
    start: vi.fn(),
    next: vi.fn(),
    end: vi.fn(),
    setMode: vi.fn(),
    answer: vi.fn(),
    close: vi.fn(),
};
const connectQuiz = vi.fn((o: Opts) => {
    opts = o;
    return conn;
});
vi.mock('@/services/quizSocket', () => ({
    connectQuiz: (o: Opts) => connectQuiz(o),
}));

describe('useQuizRoom', () => {
    beforeEach(() => vi.clearAllMocks());

    it('stays idle while disabled', () => {
        renderHook(() =>
            useQuizRoom({ code: '1', role: 'player', enabled: false })
        );
        expect(connectQuiz).not.toHaveBeenCalled();
    });

    it('tracks the room, the player identity, answers and results', () => {
        const { result, unmount } = renderHook(() =>
            useQuizRoom({ code: '123456', role: 'player', name: 'Ana' })
        );
        expect(result.current.status).toBe('connecting');

        act(() => {
            opts.onStatus('open');
            opts.onEvent({ type: 'joined', playerId: 'p1' });
            opts.onView(
                roomView({
                    state: 'QUESTION',
                    questionIndex: 0,
                    serverTime: Date.now() + 500,
                })
            );
        });
        expect(result.current.status).toBe('open');
        expect(result.current.playerId).toBe('p1');
        expect(result.current.clockSkew).toBeGreaterThan(300);
        expect(result.current.hasAnswered).toBe(false);

        act(() => result.current.answer({ index: 1 }));
        expect(conn.answer).toHaveBeenCalledWith({ index: 1 });
        expect(result.current.hasAnswered).toBe(true);

        act(() => opts.onEvent({ type: 'error', message: 'Time is up' }));
        expect(result.current.error).toBe('Time is up');
        expect(result.current.hasAnswered).toBe(false);

        act(() => {
            opts.onView(roomView({ state: 'REVEAL', questionIndex: 0 }));
            opts.onEvent({
                type: 'result',
                result: {
                    answered: true,
                    correct: true,
                    points: 800,
                    score: 800,
                    rank: 1,
                    streak: 1,
                },
            });
        });
        expect(result.current.result?.points).toBe(800);

        act(() =>
            opts.onView(roomView({ state: 'QUESTION', questionIndex: 1 }))
        );
        expect(result.current.result).toBeNull();

        unmount();
        expect(conn.close).toHaveBeenCalled();
    });

    it('forwards host commands', () => {
        const { result } = renderHook(() =>
            useQuizRoom({ code: '1', role: 'host' })
        );
        result.current.start();
        result.current.next();
        result.current.end();
        result.current.setMode('AUTO');
        expect(conn.start).toHaveBeenCalled();
        expect(conn.next).toHaveBeenCalled();
        expect(conn.end).toHaveBeenCalled();
        expect(conn.setMode).toHaveBeenCalledWith('AUTO');
    });
});

describe('useRemaining', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('counts down to the server deadline and clamps at zero', () => {
        const now = Date.now();
        const { result } = renderHook(() => useRemaining(now + 3_000, 0));
        expect(result.current).toBeGreaterThan(2_000);

        act(() => vi.advanceTimersByTime(5_000));
        expect(result.current).toBe(0);
    });

    it('is zero without a deadline', () => {
        const { result } = renderHook(() => useRemaining(0, 0));
        expect(result.current).toBe(0);
    });
});
