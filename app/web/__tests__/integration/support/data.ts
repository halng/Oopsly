import type { Shelf, Subject, TestSuite, UserProfile } from '@/types';
import { envelope, page, type Stub } from './wiremock';

export const API = '/api/oopsly';
export const AUTH = '/api/auth';
export const GAME = '/game';

export const profile: UserProfile = {
    email: 'learner@oopsly.app',
    name: 'Lena Learner',
    displayName: 'Lena',
    streakDays: 7,
    totalCardsStudied: 120,
    totalReviews: 340,
    retentionRate: 88,
    xp: 1250,
    league: 'Emerald',
    settings: {
        dailyGoal: 20,
        theme: 'light',
        language: 'en',
        isNewComer: false,
        soundEffects: true,
        targetRetentionRate: 0.9,
    },
};

export const shelf: Shelf = {
    id: 'shelf-1',
    name: 'Biology',
    slug: 'biology',
    description: 'Cells and genetics',
    icon: 'book',
    color: '#10b981',
    stats: { totalCards: 3, totalSubjects: 1, totalDue: 2 },
};

export const subject: Subject = {
    id: 'subject-1',
    shelfId: 'shelf-1',
    name: 'Cell Biology',
    slug: 'cell-biology',
    description: 'Organelles and membranes',
    color: '#10b981',
    isPublic: false,
    isDeleted: false,
    cardCount: 3,
    dueCount: 2,
    tags: 'biology,cells',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

/** Card shape the Spring API sends (`CardRes`). */
export const cardRes = (n: number, over: Record<string, unknown> = {}) => ({
    id: `card-${n}`,
    front: `Question ${n}`,
    back: `Answer ${n}`,
    hint: n === 1 ? 'Think of the powerhouse' : null,
    nextPracticeTime: '2026-01-01T00:00:00Z',
    numberOfPractice: 0,
    fsrsStability: 0,
    fsrsDifficulty: 0,
    fsrsIntervalDays: 0,
    fsrsRepetitions: 0,
    lastReviewedAt: null,
    ...over,
});

export const cards = [cardRes(1), cardRes(2), cardRes(3)];

export const testSuite: TestSuite = {
    id: 'suite-1',
    title: 'Midterm Quiz',
    slug: 'midterm-quiz',
    description: 'Chapters 1-3',
    timeLimitMinutes: 10,
    isActive: true,
    questionCount: 2,
    highestScore: null,
};

export const questions = [
    {
        id: 'q-1',
        text: 'Which organelle makes ATP?',
        type: 'SINGLE_CHOICE',
        options: ['Mitochondria', 'Nucleus', 'Ribosome'],
        correctOptionIndex: 0,
        explanation: 'The mitochondria is the powerhouse of the cell.',
    },
    {
        id: 'q-2',
        text: 'DNA is found in the nucleus.',
        type: 'TRUE_FALSE',
        options: ['True', 'False'],
        correctOptionIndex: 0,
    },
];

export const attempt = {
    testSuiteId: 'suite-1',
    title: 'Midterm Quiz',
    timeLimitSeconds: 600,
    questions: questions.map(({ id, text, type, options }) => ({
        id,
        text,
        type,
        options,
    })),
};

export const submission = {
    score: 1,
    totalQuestions: 2,
    percentage: 50,
    timeSpentSeconds: 42,
    xpGained: 30,
    totalXp: 1280,
    breakdown: [
        {
            questionId: 'q-1',
            text: 'Which organelle makes ATP?',
            type: 'SINGLE_CHOICE',
            userAnswerIndex: 0,
            userAnswerIndexes: null,
            userAnswerText: null,
            correctOptionIndex: 0,
            correctOptionIndexes: null,
            correctAnswerText: null,
            options: ['Mitochondria', 'Nucleus', 'Ribosome'],
            correct: true,
            explanation: 'The mitochondria is the powerhouse of the cell.',
        },
        {
            questionId: 'q-2',
            text: 'DNA is found in the nucleus.',
            type: 'TRUE_FALSE',
            userAnswerIndex: 1,
            userAnswerIndexes: null,
            userAnswerText: null,
            correctOptionIndex: 0,
            correctOptionIndexes: null,
            correctAnswerText: null,
            options: ['True', 'False'],
            correct: false,
            explanation: null,
        },
    ],
};

export const garden = {
    plots: Array.from({ length: 9 }, (_, index) => ({
        index,
        isUnlocked: index < 3,
        unlockCost: index < 3 ? 0 : 50 * (index - 2),
    })),
    plantedTrees: [],
    dewDrops: 10,
    sunlightOrbs: 0,
    growthPoints: 0,
    forestCoins: 0,
    seedInventory: { camphor_tree: 1 },
    forestLevel: 1,
    totalFocusMinutes: 0,
    completedSessionsCount: 0,
    totalXpContributed: 0,
    activeWeather: 'sunny',
};

export const reward = {
    species: 'wildflower_meadow',
    rarity: 'Common',
    dewDropsGained: 10,
    sunlightOrbsGained: 5,
    forestCoinsGained: 8,
    growthPointsGained: 20,
    xpGained: 0,
    garden,
};

export const catalog = [
    {
        ...subject,
        id: 'pub-1',
        name: 'Spanish Basics',
        slug: 'spanish-basics',
        description: 'Everyday greetings and numbers',
        tags: 'language,spanish',
        cardsPreview: [{ front: 'Hola', back: 'Hello' }],
    },
    {
        ...subject,
        id: 'pub-2',
        name: 'Organic Chemistry',
        slug: 'organic-chemistry',
        description: 'Functional groups',
        tags: 'chemistry',
        cardsPreview: [],
    },
];

export const publicTestSuites = [
    {
        ...testSuite,
        id: 'pub-suite-1',
        title: 'Cell Biology Quiz',
        slug: 'cell-biology-quiz',
        description: 'Organelles and membranes',
        isPublic: true,
        questionCount: 12,
    },
];

export const communities = [
    {
        id: 'comm-1',
        name: 'Night Owls',
        description: 'Late night studiers',
        isPrivate: false,
        memberCount: 12,
        ownerId: 'u-9',
        ownerName: 'Omar',
        userRole: 'NONE',
        createdAt: '2026-01-01T00:00:00Z',
    },
    {
        id: 'comm-2',
        name: 'Biology Club',
        description: 'Cells and more',
        isPrivate: true,
        memberCount: 3,
        ownerId: 'u-1',
        ownerName: 'Lena',
        userRole: 'OWNER',
        createdAt: '2026-01-01T00:00:00Z',
    },
];

export const members = [
    {
        id: 'm-1',
        communityId: 'comm-2',
        userId: 'u-1',
        displayName: 'Lena',
        role: 'OWNER',
        xp: 1250,
        streakDays: 7,
        cardsStudiedThisWeek: 40,
        joinedAt: '2026-01-01T00:00:00Z',
    },
    {
        id: 'm-2',
        communityId: 'comm-2',
        userId: 'u-2',
        displayName: 'Ada',
        role: 'MEMBER',
        xp: 3200,
        streakDays: 3,
        cardsStudiedThisWeek: 90,
        joinedAt: '2026-01-02T00:00:00Z',
    },
    {
        id: 'm-3',
        communityId: 'comm-2',
        userId: 'u-3',
        displayName: 'Bo',
        role: 'MEMBER',
        xp: 800,
        streakDays: 21,
        cardsStudiedThisWeek: 10,
        joinedAt: '2026-01-03T00:00:00Z',
    },
];

export const stats = {
    streakDays: 7,
    reviewedToday: 5,
    dailyGoal: 20,
    retentionRate: 88,
    totalReviews: 340,
    totalCards: 120,
    dueCards: 12,
    stateDistribution: {
        new: 30,
        learning: 20,
        review: 60,
        relearning: 5,
        mastered: 5,
    },
    upcomingDueForecast: [
        { date: '2026-01-02', dayName: 'Fri', dueCount: 4 },
        { date: '2026-01-03', dayName: 'Sat', dueCount: 9 },
    ],
    weeklyActivity: [
        { day: 'Mon', cardsReviewed: 12, retention: 85 },
        { day: 'Tue', cardsReviewed: 20, retention: 90 },
    ],
};

export const leaderboard = [
    {
        id: 'u-1',
        displayName: 'Ada',
        xp: 3200,
        streakDays: 30,
        rank: 1,
        league: 'Diamond',
    },
    {
        id: 'u-2',
        displayName: 'Lena',
        xp: 1250,
        streakDays: 7,
        rank: 2,
        league: 'Emerald',
        isCurrentUser: true,
    },
];

const ok = (method: Stub['method'], path: string, data: unknown): Stub => ({
    method,
    path,
    body: envelope(data),
});

/** Happy-path answers for every endpoint the web app calls. */
export function defaultStubs(): Stub[] {
    const subjectWithCards = {
        ...subject,
        cards: cards.map((c) => cardRes(Number(c.id.slice(5)))),
        testSuites: [testSuite],
    };
    return [
        // auth service
        ok('POST', `${AUTH}/v1/otp`, null),
        ok('POST', `${AUTH}/v1/otp/validate`, {
            access_token: 'access-jwt',
            refresh_token: 'refresh-jwt',
            type: 'Bearer',
        }),
        ok('GET', `${AUTH}/v1/user-profiles`, profile),
        ok('PATCH', `${AUTH}/v1/user-profiles`, profile),
        ok('PATCH', `${AUTH}/v1/user-profiles/settings/newcomer`, null),
        ok('POST', `${AUTH}/v1/user-profiles/study-reminder`, null),
        ok('POST', `${AUTH}/v1/user-profiles/study-reminder/calendar`, {
            filename: 'oopsly-study-reminder.ics',
            ics: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
        }),
        ok('PATCH', `${AUTH}/v1/user-settings`, profile.settings),
        // api service
        ok('GET', `${API}/v1/ping`, 'pong'),
        ok('GET', `${API}/v1/shelves`, page([shelf])),
        ok('POST', `${API}/v1/shelves`, shelf),
        ok('PATCH', `${API}/v1/shelves/shelf-1`, shelf),
        ok('PATCH', `${API}/v1/shelves/shelf-1/delete`, shelf),
        ok('GET', `${API}/v1/shelves/shelf-1/subjects`, page([subject])),
        ok('POST', `${API}/v1/shelves/shelf-1/subjects`, subject),
        ok('GET', `${API}/api/subjects/subject-1`, subjectWithCards),
        ok('PATCH', `${API}/api/subjects/subject-1`, subject),
        ok('PATCH', `${API}/api/subjects/subject-1/delete`, subject),
        ok(
            'GET',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/cards`,
            page(cards)
        ),
        ok(
            'POST',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/cards`,
            'created'
        ),
        ok(
            'GET',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/cards/due`,
            cards.slice(0, 2)
        ),
        ok(
            'PUT',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/cards/difficulty`,
            {
                cards: [
                    // WireMock templating echoes the graded card id back.
                    cardRes(1, {
                        id: "{{jsonPath request.body '$[0].cardId'}}",
                        fsrsRepetitions: 1,
                        fsrsStability: 2.5,
                        lastReviewedAt: '2026-01-02T00:00:00Z',
                        nextPracticeTime: '2099-01-01T00:00:00Z',
                    }),
                ],
                xpGained: 10,
                totalXp: 1260,
            }
        ),
        ok('PATCH', `${API}/api/cards/card-1`, {
            ...cardRes(1),
            subjectId: 'subject-1',
            isDeleted: false,
        }),
        ok('PATCH', `${API}/api/cards/card-1/delete`, null),
        ok('PATCH', `${API}/api/cards/card-2/delete`, null),
        ok('POST', `${API}/api/generate-cards`, [
            {
                front: 'What is DNA?',
                back: 'Genetic material',
                hint: 'Double helix',
            },
            {
                front: 'What is RNA?',
                back: 'Messenger molecule',
                hint: 'Single strand',
            },
        ]),
        ok(
            'GET',
            `${API}/v1/cards/due`,
            cards.slice(0, 2).map((c) => ({
                ...c,
                shelfId: 'shelf-1',
                subjectId: 'subject-1',
                subjectName: 'Cell Biology',
            }))
        ),
        ok(
            'POST',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/study-sessions`,
            { id: 'session-1', xpGained: 25, totalXp: 1275 }
        ),
        ok('GET', `${API}/v1/shelves/shelf-1/test-suites`, [testSuite]),
        ok('POST', `${API}/v1/shelves/shelf-1/test-suites`, testSuite),
        ok('PUT', `${API}/v1/shelves/shelf-1/test-suites/suite-1`, testSuite),
        ok('PATCH', `${API}/v1/shelves/shelf-1/test-suites/suite-1`, null),
        ok(
            'GET',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/questions`,
            questions
        ),
        ok(
            'POST',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/questions`,
            questions[0]
        ),
        ok(
            'POST',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/questions/bulk`,
            questions
        ),
        ok(
            'PUT',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/questions/q-1`,
            questions[0]
        ),
        ok(
            'PATCH',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/questions/q-1`,
            null
        ),
        ok(
            'GET',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/attempt`,
            attempt
        ),
        ok(
            'POST',
            `${API}/v1/shelves/shelf-1/test-suites/suite-1/submit`,
            submission
        ),
        ok('GET', `${API}/v1/users/me/stats`, stats),
        ok('GET', `${API}/leaderboard`, leaderboard),
        ok('GET', `${API}/discover`, page(catalog)),
        ok('GET', `${API}/discover/test-suites`, page(publicTestSuites)),
        ok('POST', `${API}/discover/pub-1/clone`, subject),
        ok('POST', `${API}/discover/test-suites/pub-suite-1/clone`, testSuite),
        ok('GET', `${API}/communities`, communities),
        ok('GET', `${API}/communities/my`, [communities[1]]),
        ok('POST', `${API}/communities`, communities[0]),
        ok('POST', `${API}/communities/comm-1/join`, { status: 'JOINED' }),
        ok('GET', `${API}/communities/comm-2/leaderboard`, {
            community: communities[1],
            members,
        }),
        ok('GET', `${API}/communities/comm-2/requests`, []),
        ok('POST', `${API}/communities/comm-2/invite`, members[1]),
        // game service
        ok('GET', `${GAME}/v1/game/garden`, garden),
        ok('POST', `${GAME}/v1/game/rewards/focus`, reward),
        ok('POST', `${GAME}/v1/game/rewards/review`, reward),
        ok('POST', `${GAME}/v1/game/rewards/test`, reward),
    ];
}
