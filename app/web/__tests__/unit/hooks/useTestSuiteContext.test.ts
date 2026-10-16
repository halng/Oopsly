import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestSuiteContext } from '@/hooks/useTestSuiteContext';
import { ApiService } from '@/services/api';
import { useShelfStore, useTestSuiteStore } from '@/store';
import { shelf, testSuite } from '@/__tests__/unit/helpers/studyFixtures';

vi.mock('next/navigation', () => ({
    useParams: () => ({ slug: 'science', testSlug: 'midterm' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getShelves: vi.fn(),
        getTestSuites: vi.fn(),
    },
}));

describe('useTestSuiteContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useShelfStore.setState({ shelves: null }, false);
        useTestSuiteStore.setState({ testSuites: {} }, false);
    });

    it('resolves from the store without fetching', async () => {
        useShelfStore.getState().setShelves([shelf]);
        useTestSuiteStore.getState().setTestSuites(shelf.id, [testSuite]);
        const { result } = renderHook(() => useTestSuiteContext());
        expect(result.current.isLoading).toBe(false);
        expect(result.current.testSuite?.id).toBe('ts1');
        expect(result.current.baseUrl).toBe('/home/science/tests/midterm');
        expect(ApiService.getTestSuites).not.toHaveBeenCalled();
    });

    it('hydrates empty stores from the API', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: { entities: [shelf], currentPage: 1, totalItems: 1, totalPages: 1, hasNextPage: false },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.getTestSuites).mockResolvedValue({
            isSuccess: true,
            data: [testSuite],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        const { result } = renderHook(() => useTestSuiteContext());
        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.shelf?.slug).toBe('science');
        expect(result.current.testSuite?.slug).toBe('midterm');
        expect(result.current.notFound).toBe(false);
    });
});
