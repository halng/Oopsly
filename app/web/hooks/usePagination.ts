'use client';
import { useState } from 'react';

export interface PageOf<T> {
    page: number;
    totalPages: number;
    pageItems: T[];
    setPage: (page: number) => void;
}

/**
 * Pages a list that is already in memory. The page is clamped when the list
 * shrinks (a delete, a search) and returns to the first page when `resetKey`
 * changes, so a new search never lands on page 4 of nothing.
 */
export function usePagination<T>(
    items: T[],
    pageSize: number,
    resetKey?: unknown
): PageOf<T> {
    const [state, setState] = useState({ requested: 1, key: resetKey });
    if (!Object.is(state.key, resetKey)) {
        setState({ requested: 1, key: resetKey });
    }
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(Math.max(1, state.requested), totalPages);

    return {
        page,
        totalPages,
        pageItems: items.slice((page - 1) * pageSize, page * pageSize),
        setPage: (requested) => setState((s) => ({ ...s, requested })),
    };
}
