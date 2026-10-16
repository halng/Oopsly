import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import { ApiService } from '@/services/api';
import { useShelfStore, useSubjectStore } from '@/store';
import { shelf, subject } from '@/__tests__/unit/helpers/studyFixtures';

vi.mock('next/navigation', () => ({
    useParams: () => ({ slug: 'science', subSlug: 'biology' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getShelves: vi.fn(),
        getShelfSubjects: vi.fn(),
    },
}));

describe('useSubjectContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useShelfStore.setState({ shelves: null }, false);
        useSubjectStore.setState({ subjects: {} }, false);
    });

    it('resolves from the store without fetching', async () => {
        useShelfStore.getState().setShelves([shelf]);
        useSubjectStore.getState().setSubjects(shelf.id, [subject]);
        const { result } = renderHook(() => useSubjectContext());
        expect(result.current.isLoading).toBe(false);
        expect(result.current.subject?.id).toBe('sub1');
        expect(result.current.baseUrl).toBe('/home/science/subjects/biology');
        expect(ApiService.getShelves).not.toHaveBeenCalled();
    });

    it('hydrates empty stores from the API', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [shelf],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [subject],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        const { result } = renderHook(() => useSubjectContext());
        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.shelf?.slug).toBe('science');
        expect(result.current.subject?.slug).toBe('biology');
        expect(result.current.notFound).toBe(false);
    });

    it('continues through shelf pages until the requested shelf is found', async () => {
        const laterShelf = { ...shelf, id: 'shelf2', slug: 'science' };
        vi.mocked(ApiService.getShelves).mockImplementation(async (page) => ({
            isSuccess: true,
            data: {
                entities: page === 1 ? [] : [laterShelf],
                currentPage: page,
                totalItems: 101,
                totalPages: 2,
                hasNextPage: page === 1,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        }));
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [subject],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });

        const { result } = renderHook(() => useSubjectContext());
        await waitFor(() => expect(result.current.notFound).toBe(false));

        expect(ApiService.getShelves).toHaveBeenNthCalledWith(1, 1, 100);
        expect(ApiService.getShelves).toHaveBeenNthCalledWith(2, 2, 100);
        expect(result.current.shelf?.id).toBe('shelf2');
    });
});
