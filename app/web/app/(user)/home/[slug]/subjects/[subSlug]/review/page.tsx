'use client';
import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Grade } from '@/types';
import { ApiService } from '@/services/api';
import { QueueLimits } from '@/utils/reviewQueue';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import CardReviewSession from '@/components/study/CardReviewSession';

const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_NEW_PER_DAY = 10;

export default function ReviewPage() {
    const router = useRouter();
    const {
        shelf,
        subject,
        baseUrl,
        isLoading: isContextLoading,
        notFound,
    } = useSubjectContext();

    const limits = useMemo<QueueLimits>(
        () => ({
            reviewLimit: subject?.dailyLimit ?? DEFAULT_DAILY_LIMIT,
            newLimit: subject?.newCardsPerDay ?? DEFAULT_NEW_PER_DAY,
        }),
        [subject?.dailyLimit, subject?.newCardsPerDay]
    );

    const loadCards = useCallback(async () => {
        if (!shelf || !subject) return [];
        const res = await ApiService.getDueCards(
            shelf.id,
            subject.id,
            limits.reviewLimit ?? DEFAULT_DAILY_LIMIT,
            limits.newLimit ?? DEFAULT_NEW_PER_DAY
        );
        return res.isSuccess ? (res.data ?? []) : [];
    }, [limits.newLimit, limits.reviewLimit, shelf, subject]);

    const loadLibrary = useCallback(async () => {
        if (!shelf || !subject) return [];
        const all = await ApiService.getSubjectCards(shelf.id, subject.id);
        return all.isSuccess ? (all.data?.entities ?? []) : [];
    }, [shelf, subject]);

    const gradeCard = useCallback(
        async (card: Card, grade: Grade) => {
            if (!shelf || !subject) return undefined;
            const res = await ApiService.gradeCard(
                shelf.id,
                subject.id,
                card.id,
                grade
            );
            return res.data;
        },
        [shelf, subject]
    );

    if (notFound) {
        return (
            <div
                data-testid="review-not-found"
                className="py-16 text-center space-y-3 text-[var(--theme-text)]"
            >
                <p className="text-sm text-[var(--theme-text)]/60">
                    This subject could not be found.
                </p>
                <button
                    type="button"
                    onClick={() => router.push('/home')}
                    className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                >
                    Back to library
                </button>
            </div>
        );
    }

    if (isContextLoading || !shelf || !subject) {
        return (
            <div
                data-testid="review-loading"
                className="py-24 text-center text-sm text-[var(--theme-text)]/70"
            >
                Loading review session...
            </div>
        );
    }

    return (
        <CardReviewSession
            title={subject.name}
            exitHref={baseUrl}
            completeHref={`${baseUrl}/review/complete`}
            subjectTitle={subject.name}
            subjectId={subject.id}
            shelfId={shelf.id}
            limits={limits}
            loadCards={loadCards}
            loadLibrary={loadLibrary}
            gradeCard={gradeCard}
        />
    );
}
