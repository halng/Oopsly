'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shelf, TestSuite } from '@/types';
import { ApiService } from '@/services/api';
import { useShelfStore, useTestSuiteStore } from '@/store';
import { resolveShelfBySlug } from './useSubjectContext';

export async function loadShelfTestSuites(shelfId: string): Promise<TestSuite[]> {
    const res = await ApiService.getTestSuites(shelfId);
    const list = res.isSuccess && res.data ? res.data : [];
    useTestSuiteStore.getState().setTestSuites(shelfId, list);
    return list;
}

export async function resolveTestSuiteBySlug(
    shelf: Shelf,
    testSlug: string
): Promise<TestSuite | null> {
    const cached = useTestSuiteStore.getState().getCurrentTestSuite(shelf.id, testSlug);
    if (cached) return cached;
    await loadShelfTestSuites(shelf.id);
    return useTestSuiteStore.getState().getCurrentTestSuite(shelf.id, testSlug);
}

export interface TestSuiteContext {
    shelf: Shelf | null;
    testSuite: TestSuite | null;
    baseUrl: string;
    shelfUrl: string;
    isLoading: boolean;
    notFound: boolean;
    /** Re-fetches the shelf's suites (e.g. after question count changes). */
    refresh: () => Promise<void>;
}

export function useTestSuiteContext(): TestSuiteContext {
    const params = useParams<{ slug: string; testSlug: string }>();
    const slug = String(params?.slug || '');
    const testSlug = String(params?.testSlug || '');

    const [state, setState] = useState<{
        shelf: Shelf | null;
        testSuite: TestSuite | null;
        isLoading: boolean;
    }>(() => {
        const shelf = slug ? useShelfStore.getState().getCurrentShelf(slug) : null;
        const testSuite =
            shelf && testSlug
                ? useTestSuiteStore.getState().getCurrentTestSuite(shelf.id, testSlug)
                : null;
        return { shelf, testSuite, isLoading: !(shelf && testSuite) };
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!slug || !testSlug) {
                setState({ shelf: null, testSuite: null, isLoading: false });
                return;
            }
            const shelf = await resolveShelfBySlug(slug);
            const testSuite = shelf ? await resolveTestSuiteBySlug(shelf, testSlug) : null;
            if (!cancelled) setState({ shelf, testSuite, isLoading: false });
        })();
        return () => {
            cancelled = true;
        };
    }, [slug, testSlug]);

    const refresh = useCallback(async () => {
        if (!state.shelf) return;
        await loadShelfTestSuites(state.shelf.id);
        const testSuite = useTestSuiteStore
            .getState()
            .getCurrentTestSuite(state.shelf.id, testSlug);
        setState((prev) => ({ ...prev, testSuite }));
    }, [state.shelf, testSlug]);

    return {
        ...state,
        refresh,
        shelfUrl: `/home/${slug}`,
        baseUrl: `/home/${slug}/tests/${testSlug}`,
        notFound: !state.isLoading && (!state.shelf || !state.testSuite),
    };
}
