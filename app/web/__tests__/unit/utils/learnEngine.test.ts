import { describe, expect, it } from 'vitest';
import {
    currentCardId,
    initialLearnState,
    learnProgress,
    learnReducer,
    questionKind,
    ROUND_SIZE,
} from '@/utils/learnEngine';

function start(ids: string[]) {
    return learnReducer(initialLearnState, { type: 'start', cardIds: ids });
}

describe('learnEngine', () => {
    it('starts a round of up to 7 cards at the MCQ level', () => {
        const ids = Array.from({ length: 9 }, (_, i) => `c${i}`);
        const state = start(ids);
        expect(state.phase).toBe('question');
        expect(state.round).toHaveLength(ROUND_SIZE);
        expect(state.roundNumber).toBe(1);
        expect(questionKind(state, state.round[0])).toBe('mcq');
        expect(currentCardId(state)).toBe(state.round[0]);
    });

    it('raises the level on a correct answer and drops it on a miss', () => {
        let state = start(['a', 'b']);
        const first = state.round[0];
        state = learnReducer(state, { type: 'answer', correct: true });
        expect(state.levels[first]).toBe(1);
        expect(state.phase).toBe('feedback');
        expect(state.round).not.toContain(first);

        state = learnReducer(state, { type: 'continue' });
        const second = state.round[0];
        state = learnReducer(state, { type: 'answer', correct: false });
        expect(state.levels[second]).toBe(0);
        expect(state.round.at(-1)).toBe(second);
        expect(state.mistakes).toBe(1);
    });

    it('override flips a written miss into a correct answer', () => {
        const missed = learnReducer(
            {
                ...initialLearnState,
                phase: 'feedback',
                levels: { a: 0 },
                order: ['a'],
                round: ['a'],
                lastAnswer: {
                    cardId: 'a',
                    correct: false,
                    previousLevel: 1,
                    given: 'nope',
                },
                mistakes: 1,
                correctAnswers: 0,
            },
            { type: 'override' }
        );
        expect(missed.lastAnswer?.overridden).toBe(true);
        expect(missed.lastAnswer?.correct).toBe(true);
        expect(missed.levels.a).toBe(2);
        expect(missed.mistakes).toBe(0);
        expect(missed.round).not.toContain('a');
    });

    it('summarizes a finished round and ends when every card is mastered', () => {
        let state = start(['a']);
        state = learnReducer(state, { type: 'answer', correct: true });
        state = learnReducer(state, { type: 'continue' });
        expect(state.phase).toBe('summary');
        state = learnReducer(state, { type: 'nextRound' });
        state = learnReducer(state, { type: 'answer', correct: true });
        state = learnReducer(state, { type: 'continue' });
        expect(state.phase).toBe('done');
        expect(learnProgress(state)).toMatchObject({
            total: 1,
            mastered: 1,
            percent: 100,
        });
    });
});
