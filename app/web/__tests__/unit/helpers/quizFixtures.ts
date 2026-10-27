import { QuizRoomView } from '@/types';

export function roomView(overrides: Partial<QuizRoomView> = {}): QuizRoomView {
    return {
        code: '123456',
        state: 'LOBBY',
        mode: 'MANUAL',
        title: 'Biology',
        hostName: 'Hao',
        maxPlayers: 20,
        questionSeconds: 20,
        totalQuestions: 2,
        questionIndex: -1,
        serverTime: 1_000,
        deadline: 0,
        question: null,
        answeredCount: 0,
        playerCount: 0,
        players: [],
        reveal: null,
        leaderboard: [],
        summary: [],
        ...overrides,
    };
}

export const question = {
    id: 'q1',
    text: 'Pick b',
    type: 'SINGLE_CHOICE' as const,
    options: ['a', 'b', 'c'],
};

export const ranks = [
    { id: 'p1', name: 'Ana', score: 900, rank: 1, delta: 900, streak: 3 },
    { id: 'p2', name: 'Ben', score: 500, rank: 2, delta: 0, streak: 0 },
    { id: 'p3', name: 'Cy', score: 100, rank: 3, delta: 100, streak: 1 },
];
