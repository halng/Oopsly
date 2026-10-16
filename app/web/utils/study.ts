import { Card } from '@/types';

export function shuffle<T>(
    items: readonly T[],
    random: () => number = Math.random
): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** Up to `n` unique backs from other cards, never equal to the correct answer. */
export function pickDistractors(
    card: Card,
    pool: readonly Card[],
    n: number,
    random: () => number = Math.random
): string[] {
    const correct = normalizeAnswer(card.back);
    const seen = new Set<string>([correct]);
    const result: string[] = [];
    for (const other of shuffle(pool, random)) {
        if (result.length >= n) break;
        if (other.id === card.id) continue;
        const key = normalizeAnswer(other.back);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(other.back);
    }
    return result;
}

export function normalizeAnswer(value: string, caseSensitive = false): string {
    const collapsed = value.trim().replace(/\s+/g, ' ');
    return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                curr[j - 1] + 1,
                prev[j] + 1,
                prev[j - 1] + cost
            );
        }
        prev = curr;
    }
    return prev[b.length];
}

/**
 * Typed-answer check used by Learn mode. Allows roughly 15% typos so that a
 * single slip on a long answer still counts.
 */
export function isAnswerCloseEnough(
    input: string,
    expected: string,
    caseSensitive = false
): boolean {
    const a = normalizeAnswer(input, caseSensitive);
    const b = normalizeAnswer(expected, caseSensitive);
    if (!a) return false;
    if (a === b) return true;
    const tolerance = Math.floor(b.length * 0.15);
    return tolerance > 0 && levenshtein(a, b) <= tolerance;
}

export function formatClock(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
