import { beforeEach, describe, expect, it } from 'vitest';
import { useTestSuiteStore } from '@/store';
import { testSuite } from '@/__tests__/unit/helpers/studyFixtures';

describe('useTestSuiteStore', () => {
    const initial = useTestSuiteStore.getState();

    beforeEach(() => {
        useTestSuiteStore.setState(initial, true);
    });

    it('stores suites per shelf and looks them up by slug', () => {
        useTestSuiteStore.getState().setTestSuites('s1', [testSuite]);
        expect(useTestSuiteStore.getState().getCurrentTestSuite('s1', 'midterm')).toEqual(
            testSuite
        );
        expect(useTestSuiteStore.getState().getCurrentTestSuite('s1', 'missing')).toBeNull();
        useTestSuiteStore.getState().clearTestSuites('s1');
        expect(useTestSuiteStore.getState().getCurrentTestSuite('s1', 'midterm')).toBeNull();
    });
});
