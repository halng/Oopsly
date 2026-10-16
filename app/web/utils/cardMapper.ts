import { Card } from '@/types';

/** Card shape returned by the Spring Boot API (`CardRes`). */
export interface CardRes {
    id: string;
    front: string;
    back: string;
    hint?: string | null;
    difficultyLevel?: string | null;
    nextPracticeTime?: string | null;
    numberOfPractice?: number | null;
    fsrsStability?: number | null;
    fsrsDifficulty?: number | null;
    fsrsIntervalDays?: number | null;
    fsrsRepetitions?: number | null;
    lastReviewedAt?: string | null;
}

function isCardRes(value: unknown): value is CardRes {
    return (
        typeof value === 'object' &&
        value !== null &&
        ('fsrsStability' in value ||
            'nextPracticeTime' in value ||
            'fsrsRepetitions' in value)
    );
}

export function mapCardRes(res: CardRes | Card, subjectId: string): Card {
    if (!isCardRes(res)) {
        return {
            ...(res as Card),
            subjectId: (res as Card).subjectId || subjectId,
        };
    }
    const now = new Date().toISOString();
    return {
        id: res.id,
        subjectId,
        front: res.front,
        back: res.back,
        hint: res.hint ?? undefined,
        tags: [],
        difficulty: res.fsrsDifficulty ?? 0,
        stability: res.fsrsStability ?? 0,
        intervalDays: res.fsrsIntervalDays ?? 0,
        repetitions: res.fsrsRepetitions ?? 0,
        dueDate: res.nextPracticeTime ?? now,
        lastReviewedAt: res.lastReviewedAt ?? undefined,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
    };
}

export function mapCardList(
    list: Array<CardRes | Card> | null | undefined,
    subjectId: string
): Card[] {
    return (list ?? []).map((c) => mapCardRes(c, subjectId));
}

/** A card that has never been reviewed. */
export function isNewCard(card: Card): boolean {
    return (card.repetitions ?? 0) === 0 && !card.lastReviewedAt;
}
