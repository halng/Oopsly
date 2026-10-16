import { Card, Grade } from '@/types';
import { isNewCard } from '@/utils/cardMapper';

export type QueueKind = 'new' | 'learning' | 'review';

export interface QueueItem {
    card: Card;
    kind: QueueKind;
}

export interface QueueCounts {
    new: number;
    learning: number;
    review: number;
}

export interface QueueLimits {
    reviewLimit?: number;
    newLimit?: number;
}

/** How many cards an "Again" card waits before it comes back. */
export const AGAIN_REINSERT_OFFSET = 3;

/** Local estimate used when the server response carries no XP (offline). */
export const FALLBACK_XP: Record<Grade, number> = { 1: 5, 2: 10, 3: 15, 4: 20 };

function cap(list: Card[], limit?: number): Card[] {
    if (limit === undefined || !Number.isFinite(limit)) return list;
    return list.slice(0, Math.max(0, Math.floor(limit)));
}

/**
 * Builds an Anki-style session: due reviews (oldest first) capped at
 * `reviewLimit`, plus new cards capped at `newLimit`, spread evenly between
 * the reviews.
 */
export function buildReviewQueue(
    cards: Card[],
    limits: QueueLimits = {}
): QueueItem[] {
    const fresh = cap(cards.filter(isNewCard), limits.newLimit);
    const reviews = cap(
        cards
            .filter((c) => !isNewCard(c))
            .sort(
                (a, b) =>
                    new Date(a.dueDate).getTime() -
                    new Date(b.dueDate).getTime()
            ),
        limits.reviewLimit
    );

    const reviewItems: QueueItem[] = reviews.map((card) => ({
        card,
        kind: 'review',
    }));
    const newItems: QueueItem[] = fresh.map((card) => ({ card, kind: 'new' }));
    if (reviewItems.length === 0) return newItems;
    if (newItems.length === 0) return reviewItems;

    const result: QueueItem[] = [];
    const step = (reviewItems.length + newItems.length) / newItems.length;
    let nextNewAt = step / 2;
    let r = 0;
    let n = 0;
    for (let i = 0; i < reviewItems.length + newItems.length; i++) {
        if (
            n < newItems.length &&
            (i >= nextNewAt || r >= reviewItems.length)
        ) {
            result.push(newItems[n++]);
            nextNewAt += step;
        } else {
            result.push(reviewItems[r++]);
        }
    }
    return result;
}

/**
 * Removes the current card. "Again" puts it back a few cards later as a
 * learning card; every other grade finishes it for this session.
 */
export function applyGrade(
    queue: QueueItem[],
    grade: Grade,
    updatedCard?: Card | null
): QueueItem[] {
    if (queue.length === 0) return queue;
    const [head, ...rest] = queue;
    if (grade !== 1) return rest;
    const position = Math.min(AGAIN_REINSERT_OFFSET, rest.length);
    const again: QueueItem = {
        card: updatedCard ?? head.card,
        kind: 'learning',
    };
    return [...rest.slice(0, position), again, ...rest.slice(position)];
}

export function countQueue(queue: QueueItem[]): QueueCounts {
    return queue.reduce<QueueCounts>(
        (acc, item) => {
            acc[item.kind] += 1;
            return acc;
        },
        { new: 0, learning: 0, review: 0 }
    );
}

/** Earliest future due date among already-reviewed cards, if any. */
export function nextDueDate(
    cards: Card[],
    now: Date = new Date()
): Date | null {
    let next: number | null = null;
    for (const card of cards) {
        if (isNewCard(card)) continue;
        const due = new Date(card.dueDate).getTime();
        if (Number.isNaN(due) || due <= now.getTime()) continue;
        if (next === null || due < next) next = due;
    }
    return next === null ? null : new Date(next);
}
