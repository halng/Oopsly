'use client';
import React, { useCallback } from 'react';
import { Card, Grade } from '@/types';
import { ApiService } from '@/services/api';
import CardReviewSession from '@/components/study/CardReviewSession';

export default function SuperReviewPage() {
    const loadCards = useCallback(async () => {
        const res = await ApiService.getDuePracticeCards();
        return res.isSuccess ? (res.data ?? []) : [];
    }, []);

    const gradeCard = useCallback(async (card: Card, grade: Grade) => {
        if (!card.shelfId) return undefined;
        const res = await ApiService.gradeCard(
            card.shelfId,
            card.subjectId,
            card.id,
            grade
        );
        return res.data;
    }, []);

    return (
        <CardReviewSession
            title="Daily review"
            exitHref="/home"
            completeHref="/home/super-review/complete"
            subjectTitle="your daily queue"
            subjectId="daily"
            shelfId=""
            loadCards={loadCards}
            gradeCard={gradeCard}
            emptyExitLabel="Back to library"
        />
    );
}
