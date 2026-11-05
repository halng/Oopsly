import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from '@/hooks/usePagination';

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('usePagination', () => {
    it('slices the list into pages of the given size', () => {
        const { result } = renderHook(() => usePagination(items(25), 10));
        expect(result.current.totalPages).toBe(3);
        expect(result.current.pageItems).toEqual(items(10));

        act(() => result.current.setPage(3));
        expect(result.current.page).toBe(3);
        expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
    });

    it('has one empty page for an empty list', () => {
        const { result } = renderHook(() => usePagination([], 10));
        expect(result.current.totalPages).toBe(1);
        expect(result.current.pageItems).toEqual([]);
    });

    it('steps back when the list shrinks below the current page', () => {
        const { result, rerender } = renderHook(
            ({ list }) => usePagination(list, 10),
            { initialProps: { list: items(25) } }
        );
        act(() => result.current.setPage(3));
        rerender({ list: items(20) });
        expect(result.current.page).toBe(2);
        expect(result.current.pageItems).toEqual(items(20).slice(10));
    });

    it('returns to the first page when the reset key changes', () => {
        const { result, rerender } = renderHook(
            ({ key }) => usePagination(items(25), 10, key),
            { initialProps: { key: '' } }
        );
        act(() => result.current.setPage(2));
        expect(result.current.page).toBe(2);
        rerender({ key: 'cell' });
        expect(result.current.page).toBe(1);
    });
});
