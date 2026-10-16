'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shelf, Subject } from '@/types';
import { ApiService } from '@/services/api';
import { useShelfStore, useSubjectStore } from '@/store';

const HYDRATE_PAGE_SIZE = 100;

/**
 * Finds the shelf by slug in the store. When the store is empty (hard refresh
 * or deep link) the shelves are fetched once and written back to the store.
 */
export async function resolveShelfBySlug(slug: string): Promise<Shelf | null> {
    const cached = useShelfStore.getState().getCurrentShelf(slug);
    if (cached) return cached;
    const res = await ApiService.getShelves(1, HYDRATE_PAGE_SIZE);
    if (!res.isSuccess || !res.data) return null;
    useShelfStore.getState().setShelves(res.data.entities);
    return useShelfStore.getState().getCurrentShelf(slug);
}

export async function resolveSubjectBySlug(
    shelf: Shelf,
    subSlug: string
): Promise<Subject | null> {
    const cached = useSubjectStore
        .getState()
        .getCurrentSubject(shelf.id, subSlug);
    if (cached) return cached;
    const res = await ApiService.getShelfSubjects(
        shelf.id,
        1,
        HYDRATE_PAGE_SIZE
    );
    if (!res.isSuccess || !res.data) return null;
    useSubjectStore.getState().setSubjects(shelf.id, res.data.entities);
    return useSubjectStore.getState().getCurrentSubject(shelf.id, subSlug);
}

export interface SubjectContext {
    shelf: Shelf | null;
    subject: Subject | null;
    baseUrl: string;
    shelfUrl: string;
    isLoading: boolean;
    notFound: boolean;
}

export function useSubjectContext(): SubjectContext {
    const params = useParams<{ slug: string; subSlug: string }>();
    const slug = String(params?.slug || '');
    const subSlug = String(params?.subSlug || '');

    const [state, setState] = useState<{
        shelf: Shelf | null;
        subject: Subject | null;
        isLoading: boolean;
    }>(() => {
        const shelf = slug
            ? useShelfStore.getState().getCurrentShelf(slug)
            : null;
        const subject =
            shelf && subSlug
                ? useSubjectStore
                      .getState()
                      .getCurrentSubject(shelf.id, subSlug)
                : null;
        return { shelf, subject, isLoading: !(shelf && subject) };
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!slug || !subSlug) {
                setState({ shelf: null, subject: null, isLoading: false });
                return;
            }
            const shelf = await resolveShelfBySlug(slug);
            const subject = shelf
                ? await resolveSubjectBySlug(shelf, subSlug)
                : null;
            if (!cancelled) setState({ shelf, subject, isLoading: false });
        })();
        return () => {
            cancelled = true;
        };
    }, [slug, subSlug]);

    return {
        ...state,
        shelfUrl: `/home/${slug}`,
        baseUrl: `/home/${slug}/subjects/${subSlug}`,
        notFound: !state.isLoading && (!state.shelf || !state.subject),
    };
}
