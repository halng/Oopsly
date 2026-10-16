import { create } from 'zustand';
import { TestSuite } from '@/types';

export const useTestSuiteStore = create<{
    testSuites: { [shelfId: string]: TestSuite[] };
    setTestSuites: (shelfId: string, testSuites: TestSuite[]) => void;
    clearTestSuites: (shelfId: string) => void;
    getCurrentTestSuite: (shelfId: string, slug: string) => TestSuite | null;
}>((set, get) => ({
    testSuites: {},
    setTestSuites: (shelfId, testSuites) =>
        set((state) => ({
            testSuites: { ...state.testSuites, [shelfId]: testSuites },
        })),
    clearTestSuites: (shelfId) =>
        set((state) => ({
            testSuites: { ...state.testSuites, [shelfId]: [] },
        })),
    getCurrentTestSuite: (shelfId, slug) => {
        const list = get().testSuites[shelfId];
        return list ? list.find((t) => t.slug === slug) || null : null;
    },
}));
