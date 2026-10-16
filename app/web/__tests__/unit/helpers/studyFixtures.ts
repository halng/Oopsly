import { Card, Shelf, Subject, TestSuite } from '@/types';

export const shelf: Shelf = {
    id: 's1',
    name: 'Science',
    slug: 'science',
    description: 'Core science',
    icon: 'folder',
    color: '#2563eb',
    stats: { totalCards: 2, totalSubjects: 1, totalDue: 1 },
};

export const subject: Subject = {
    id: 'sub1',
    shelfId: 's1',
    name: 'Biology',
    slug: 'biology',
    description: 'Cells',
    isPublic: false,
    isDeleted: false,
    cardCount: 2,
    dueCount: 1,
    dailyLimit: 20,
    newCardsPerDay: 10,
    tags: 'cells',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

export const testSuite: TestSuite = {
    id: 'ts1',
    title: 'Midterm',
    slug: 'midterm',
    description: 'Chapter 1',
    timeLimitMinutes: 10,
    isActive: true,
    questionCount: 2,
    highestScore: null,
};

export function card(overrides: Partial<Card> & Pick<Card, 'id'>): Card {
    return {
        subjectId: 'sub1',
        front: `Front ${overrides.id}`,
        back: `Back ${overrides.id}`,
        tags: [],
        difficulty: 0,
        stability: 0,
        intervalDays: 0,
        repetitions: 0,
        dueDate: '2026-01-01T00:00:00Z',
        isDeleted: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

export const subjectContext = {
    shelf,
    subject,
    baseUrl: '/home/science/subjects/biology',
    shelfUrl: '/home/science',
    isLoading: false,
    notFound: false,
};

export const testSuiteContext = {
    shelf,
    testSuite,
    baseUrl: '/home/science/tests/midterm',
    shelfUrl: '/home/science',
    isLoading: false,
    notFound: false,
    refresh: async () => undefined,
};
