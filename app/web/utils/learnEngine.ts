/**
 * Adaptive Learn mode, modelled after Quizlet Learn.
 *
 * Every card climbs two levels: 0 (new) is asked as multiple choice, 1 as a
 * written answer, and 2 means mastered. A wrong answer drops the card one
 * level and puts it back at the end of the current round.
 */

export type LearnLevel = 0 | 1 | 2;
export type LearnQuestionKind = 'mcq' | 'written';
export type LearnPhase = 'idle' | 'question' | 'feedback' | 'summary' | 'done';

export const ROUND_SIZE = 7;
export const MASTERED: LearnLevel = 2;

export interface LearnAnswer {
    cardId: string;
    correct: boolean;
    previousLevel: LearnLevel;
    given?: string;
    overridden?: boolean;
}

export interface LearnState {
    phase: LearnPhase;
    levels: Record<string, LearnLevel>;
    order: string[];
    round: string[];
    roundNumber: number;
    roundResults: LearnAnswer[];
    lastAnswer: LearnAnswer | null;
    questionNumber: number;
    correctAnswers: number;
    mistakes: number;
}

export type LearnAction =
    | { type: 'start'; cardIds: string[] }
    | { type: 'answer'; correct: boolean; given?: string }
    | { type: 'override' }
    | { type: 'continue' }
    | { type: 'nextRound' };

export const initialLearnState: LearnState = {
    phase: 'idle',
    levels: {},
    order: [],
    round: [],
    roundNumber: 0,
    roundResults: [],
    lastAnswer: null,
    questionNumber: 0,
    correctAnswers: 0,
    mistakes: 0,
};

function clampLevel(value: number): LearnLevel {
    return Math.max(0, Math.min(MASTERED, value)) as LearnLevel;
}

function isMastered(state: Pick<LearnState, 'levels'>, id: string): boolean {
    return state.levels[id] === MASTERED;
}

function buildRound(state: LearnState): LearnState {
    const pending = state.order.filter((id) => !isMastered(state, id));
    if (pending.length === 0) {
        return { ...state, phase: 'done', round: [] };
    }
    const round = pending.slice(0, ROUND_SIZE);
    const picked = new Set(round);
    return {
        ...state,
        phase: 'question',
        round,
        order: [...state.order.filter((id) => !picked.has(id)), ...round],
        roundNumber: state.roundNumber + 1,
        roundResults: [],
        lastAnswer: null,
        questionNumber: state.questionNumber + 1,
    };
}

export function learnReducer(state: LearnState, action: LearnAction): LearnState {
    switch (action.type) {
        case 'start': {
            const unique = Array.from(new Set(action.cardIds));
            const levels = Object.fromEntries(unique.map((id) => [id, 0 as LearnLevel]));
            return buildRound({ ...initialLearnState, levels, order: unique });
        }
        case 'answer': {
            if (state.phase !== 'question' || state.round.length === 0) return state;
            const [cardId, ...rest] = state.round;
            const previousLevel = state.levels[cardId] ?? 0;
            const nextLevel = clampLevel(previousLevel + (action.correct ? 1 : -1));
            const answer: LearnAnswer = {
                cardId,
                correct: action.correct,
                previousLevel,
                given: action.given,
            };
            return {
                ...state,
                phase: 'feedback',
                levels: { ...state.levels, [cardId]: nextLevel },
                round: action.correct ? rest : [...rest, cardId],
                roundResults: [...state.roundResults, answer],
                lastAnswer: answer,
                correctAnswers: state.correctAnswers + (action.correct ? 1 : 0),
                mistakes: state.mistakes + (action.correct ? 0 : 1),
            };
        }
        case 'override': {
            const last = state.lastAnswer;
            if (state.phase !== 'feedback' || !last || last.correct) return state;
            const lastIndex = state.round.lastIndexOf(last.cardId);
            const round =
                lastIndex === -1
                    ? state.round
                    : [...state.round.slice(0, lastIndex), ...state.round.slice(lastIndex + 1)];
            const fixed: LearnAnswer = { ...last, correct: true, overridden: true };
            return {
                ...state,
                levels: { ...state.levels, [last.cardId]: clampLevel(last.previousLevel + 1) },
                round,
                roundResults: [...state.roundResults.slice(0, -1), fixed],
                lastAnswer: fixed,
                correctAnswers: state.correctAnswers + 1,
                mistakes: Math.max(0, state.mistakes - 1),
            };
        }
        case 'continue': {
            if (state.phase !== 'feedback') return state;
            if (state.round.length > 0) {
                return {
                    ...state,
                    phase: 'question',
                    lastAnswer: null,
                    questionNumber: state.questionNumber + 1,
                };
            }
            const allMastered = state.order.every((id) => isMastered(state, id));
            return { ...state, phase: allMastered ? 'done' : 'summary', lastAnswer: null };
        }
        case 'nextRound': {
            if (state.phase !== 'summary') return state;
            return buildRound(state);
        }
        default:
            return state;
    }
}

export function currentCardId(state: LearnState): string | null {
    return state.phase === 'question' || state.phase === 'feedback'
        ? state.lastAnswer?.cardId ?? state.round[0] ?? null
        : null;
}

export function questionKind(state: LearnState, cardId: string): LearnQuestionKind {
    return (state.levels[cardId] ?? 0) === 0 ? 'mcq' : 'written';
}

export interface LearnProgress {
    total: number;
    mastered: number;
    learning: number;
    fresh: number;
    percent: number;
}

export function learnProgress(state: LearnState): LearnProgress {
    const ids = state.order;
    let mastered = 0;
    let learning = 0;
    let points = 0;
    for (const id of ids) {
        const level = state.levels[id] ?? 0;
        points += level;
        if (level === MASTERED) mastered += 1;
        else if (level === 1) learning += 1;
    }
    const total = ids.length;
    return {
        total,
        mastered,
        learning,
        fresh: total - mastered - learning,
        percent: total === 0 ? 0 : Math.round((points / (total * MASTERED)) * 100),
    };
}
