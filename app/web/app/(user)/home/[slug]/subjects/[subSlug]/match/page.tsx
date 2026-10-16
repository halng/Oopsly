'use client';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, RotateCcw, Trophy } from 'lucide-react';
import { Card } from '@/types';
import { ApiService } from '@/services/api';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import { useStudyFx } from '@/hooks/useStudyFx';
import {
    StudyHeader,
    StudyProgress,
    StudyResultCard,
    StudyShell,
} from '@/components/study';
import { formatClock, shuffle } from '@/utils/study';

const PAIRS_PER_GAME = 6;
const MIN_CARDS = 2;
const MISTAKE_PENALTY_SECONDS = 1;
const MISMATCH_FLASH_MS = 600;
const TICK_MS = 100;

interface MatchTile {
    id: string;
    cardId: string;
    side: 'front' | 'back';
    text: string;
}

function matchBestTimeKey(subjectId: string): string {
    return `oopsly:match-best:${subjectId}`;
}

function readBestTime(subjectId: string): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(matchBestTimeKey(subjectId));
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function buildTiles(cards: Card[]): MatchTile[] {
    const picked = shuffle(cards).slice(0, PAIRS_PER_GAME);
    return shuffle(
        picked.flatMap((c) => [
            {
                id: `front-${c.id}`,
                cardId: c.id,
                side: 'front' as const,
                text: c.front,
            },
            {
                id: `back-${c.id}`,
                cardId: c.id,
                side: 'back' as const,
                text: c.back,
            },
        ])
    );
}

export default function MatchPage() {
    const router = useRouter();
    const { play } = useStudyFx();
    const {
        shelf,
        subject,
        baseUrl,
        isLoading: isContextLoading,
        notFound,
    } = useSubjectContext();

    const [cards, setCards] = useState<Card[]>([]);
    const [isLoadingCards, setIsLoadingCards] = useState(true);
    const [tiles, setTiles] = useState<MatchTile[]>([]);
    const [selected, setSelected] = useState<MatchTile | null>(null);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [mismatch, setMismatch] = useState<[string, string] | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [finished, setFinished] = useState(false);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [isNewBest, setIsNewBest] = useState(false);
    const [xpGained, setXpGained] = useState<number | null>(null);
    const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pairCount = tiles.length / 2;
    const totalSeconds = elapsedMs / 1000 + mistakes * MISTAKE_PENALTY_SECONDS;

    const newGame = useCallback((list: Card[]) => {
        if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
        setTiles(buildTiles(list));
        setSelected(null);
        setMatched(new Set());
        setMismatch(null);
        setMistakes(0);
        setStartedAt(null);
        setElapsedMs(0);
        setFinished(false);
        setIsNewBest(false);
        setXpGained(null);
    }, []);

    useEffect(() => {
        if (!shelf || !subject) return;
        let cancelled = false;
        (async () => {
            const res = await ApiService.getSubjectCards(shelf.id, subject.id);
            if (cancelled) return;
            setBestTime(readBestTime(subject.id));
            const list = res.isSuccess ? (res.data?.entities ?? []) : [];
            setCards(list);
            setIsLoadingCards(false);
            if (list.length >= MIN_CARDS) newGame(list);
        })();
        return () => {
            cancelled = true;
        };
    }, [newGame, shelf, subject]);

    useEffect(() => {
        if (startedAt === null || finished) return;
        const id = setInterval(
            () => setElapsedMs(Date.now() - startedAt),
            TICK_MS
        );
        return () => clearInterval(id);
    }, [finished, startedAt]);

    useEffect(
        () => () => {
            if (mismatchTimerRef.current)
                clearTimeout(mismatchTimerRef.current);
        },
        []
    );

    const finish = useCallback(
        (finalMistakes: number) => {
            if (!shelf || !subject || startedAt === null) return;
            const finalElapsed = Date.now() - startedAt;
            setElapsedMs(finalElapsed);
            setFinished(true);
            play('complete');
            const seconds =
                finalElapsed / 1000 + finalMistakes * MISTAKE_PENALTY_SECONDS;
            const rounded = Math.round(seconds * 10) / 10;
            const previous = readBestTime(subject.id);
            if (previous === null || rounded < previous) {
                window.localStorage.setItem(
                    matchBestTimeKey(subject.id),
                    String(rounded)
                );
                setBestTime(rounded);
                setIsNewBest(true);
            }
            ApiService.logStudySession(shelf.id, subject.id, {
                mode: 'MATCH',
                totalItems: pairCount,
                correctCount: pairCount,
                mistakes: finalMistakes,
                durationSeconds: Math.max(1, Math.round(seconds)),
            }).then((res) =>
                setXpGained(res.isSuccess && res.data ? res.data.xpGained : 0)
            );
        },
        [pairCount, play, shelf, startedAt, subject]
    );

    const handleTile = useCallback(
        (tile: MatchTile) => {
            if (finished || mismatch || matched.has(tile.cardId)) return;
            if (startedAt === null) setStartedAt(Date.now());
            if (!selected) {
                play('tap');
                setSelected(tile);
                return;
            }
            if (selected.id === tile.id) {
                setSelected(null);
                return;
            }
            if (selected.cardId === tile.cardId) {
                const next = new Set(matched).add(tile.cardId);
                play('match');
                setMatched(next);
                setSelected(null);
                if (next.size === pairCount) finish(mistakes);
                return;
            }
            play('incorrect');
            setMismatch([selected.id, tile.id]);
            setMistakes((m) => m + 1);
            mismatchTimerRef.current = setTimeout(() => {
                setMismatch(null);
                setSelected(null);
            }, MISMATCH_FLASH_MS);
        },
        [
            finish,
            finished,
            matched,
            mismatch,
            mistakes,
            pairCount,
            play,
            selected,
            startedAt,
        ]
    );

    const exit = () => router.push(baseUrl);

    const bestLabel = useMemo(
        () => (bestTime === null ? null : `${bestTime.toFixed(1)}s`),
        [bestTime]
    );

    if (notFound) {
        return (
            <div
                data-testid="match-not-found"
                className="py-16 text-center text-sm text-[var(--theme-text)]/60"
            >
                This subject could not be found.
            </div>
        );
    }

    if (isContextLoading || isLoadingCards) {
        return (
            <div
                data-testid="match-loading"
                className="py-24 text-center text-sm text-[var(--theme-text)]/70"
            >
                Loading matching game...
            </div>
        );
    }

    if (cards.length < MIN_CARDS) {
        return (
            <div
                data-testid="match-empty"
                className="py-16 text-center space-y-3 text-[var(--theme-text)]"
            >
                <p className="text-sm text-[var(--theme-text)]/60">
                    Match needs at least {MIN_CARDS} cards in this subject.
                </p>
                <button
                    type="button"
                    data-testid="btn-match-close"
                    onClick={exit}
                    className="px-4 py-2 bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                    Back to subject
                </button>
            </div>
        );
    }

    return (
        <StudyShell
            testId="matching-game-page"
            className="max-w-3xl mx-auto p-6"
        >
            <StudyHeader
                icon={<Gamepad2 className="w-5 h-5" />}
                title={`Match: ${subject?.name ?? ''}`}
                subtitle={
                    startedAt === null && !finished
                        ? 'Tap any tile to start the clock'
                        : `+${MISTAKE_PENALTY_SECONDS}s per mistake`
                }
                seconds={Math.floor(totalSeconds)}
                extra={
                    bestLabel && (
                        <span
                            data-testid="match-best-time"
                            className="text-xs text-[var(--theme-text)]/55"
                        >
                            Best {bestLabel}
                        </span>
                    )
                }
                onClose={exit}
                closeTestId="btn-match-close"
            />

            {!finished && (
                <StudyProgress
                    testId="match-progress-bar"
                    segments={[
                        {
                            width:
                                (matched.size / Math.max(pairCount, 1)) * 100,
                        },
                    ]}
                />
            )}

            {finished ? (
                <StudyResultCard
                    testId="match-complete"
                    icon={
                        <Trophy className="w-8 h-8 text-[var(--theme-accent)]" />
                    }
                    title={isNewBest ? 'New best time!' : 'All cleared!'}
                    description={`Finished in ${totalSeconds.toFixed(1)}s (${formatClock(totalSeconds)}) with ${mistakes} mistakes.`}
                    xpGained={xpGained}
                    stats={[
                        { label: 'Pairs', value: pairCount },
                        { label: 'Time', value: `${totalSeconds.toFixed(1)}s` },
                        { label: 'Mistakes', value: mistakes },
                        { label: 'Best', value: bestLabel ?? '-' },
                    ]}
                    actions={
                        <>
                            <button
                                type="button"
                                data-testid="btn-match-restart"
                                onClick={() => newGame(cards)}
                                className="px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4 inline mr-1" />
                                Play again
                            </button>
                            <button
                                type="button"
                                onClick={exit}
                                className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                            >
                                Back to subject
                            </button>
                        </>
                    }
                />
            ) : (
                <div className="py-6 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {tiles.map((tile, index) => {
                            const isMatched = matched.has(tile.cardId);
                            const isSelected = selected?.id === tile.id;
                            const isMismatched = mismatch?.includes(tile.id);
                            const style = isMatched
                                ? 'study-matched border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)]'
                                : isMismatched
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 study-shake'
                                  : isSelected
                                    ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_16%,transparent)] study-pop'
                                    : 'bg-[var(--theme-subtle)] hover:border-[var(--theme-accent)] hover:-translate-y-0.5';
                            return (
                                <button
                                    key={tile.id}
                                    type="button"
                                    data-testid={`match-tile-${tile.id}`}
                                    disabled={isMatched}
                                    aria-pressed={isSelected}
                                    onClick={() => handleTile(tile)}
                                    style={{
                                        animationDelay: isMatched
                                            ? undefined
                                            : `${index * 30}ms`,
                                    }}
                                    className={`min-h-[108px] p-3.5 rounded-2xl border border-[var(--theme-border)] text-left text-xs font-medium cursor-pointer break-words transition-all ${isMatched ? '' : 'study-enter'} ${style}`}
                                >
                                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[var(--theme-text)]/35 mb-1.5">
                                        {tile.side === 'front'
                                            ? 'Term'
                                            : 'Definition'}
                                    </span>
                                    <span className="block text-sm font-semibold leading-snug">
                                        {tile.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-[var(--theme-text)]/45">
                        <span data-testid="match-progress">
                            Matched: {matched.size} / {pairCount}
                        </span>
                        <span data-testid="match-mistakes">
                            Mistakes: {mistakes}
                        </span>
                    </div>
                </div>
            )}
        </StudyShell>
    );
}
