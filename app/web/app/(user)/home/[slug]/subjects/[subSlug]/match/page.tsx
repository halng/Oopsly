'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Gamepad2, RotateCcw, Timer, Trophy, X } from 'lucide-react';
import { Card, Subject } from '@/types';
import { ApiService } from '@/services/api';

interface MatchItem {
    id: string;
    cardId: string;
    type: 'front' | 'back';
    text: string;
}

export default function MatchPage() {
    const params = useParams<{ shelfId: string; subjectId: string }>();
    const router = useRouter();
    const shelfId = String(params.shelfId || '');
    const subjectId = String(params.subjectId || '');
    const base = `/home/${shelfId}/subjects/${subjectId}`;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<MatchItem | null>(null);
    const [matchedCardIds, setMatchedCardIds] = useState<Set<string>>(
        new Set()
    );
    const [mismatchedPair, setMismatchedPair] = useState<[string, string] | null>(
        null
    );
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [isGameActive, setIsGameActive] = useState(true);
    const [mistakes, setMistakes] = useState(0);
    const [shuffleKey, setShuffleKey] = useState(0);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const [subjectRes, cardsRes] = await Promise.all([
                ApiService.getSubject(subjectId),
                ApiService.getSubjectCards(subjectId),
            ]);
            if (!mounted) return;
            if (subjectRes.isSuccess && subjectRes.data) {
                setSubject(subjectRes.data);
            }
            setCards((cardsRes.data || []).filter((c) => !c.isDeleted));
            setIsLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [subjectId]);

    const gameCards = useMemo(() => cards.slice(0, 6), [cards]);
    const tiles: MatchItem[] = useMemo(() => {
        const items: MatchItem[] = [];
        gameCards.forEach((c) => {
            items.push({
                id: `front-${c.id}`,
                cardId: c.id,
                type: 'front',
                text: c.front,
            });
            items.push({
                id: `back-${c.id}`,
                cardId: c.id,
                type: 'back',
                text: c.back,
            });
        });
        return [...items].sort(
            (a, b) =>
                ((a.id.charCodeAt(0) + shuffleKey) % 7) -
                ((b.id.charCodeAt(0) + shuffleKey) % 7)
        );
    }, [gameCards, shuffleKey]);

    useEffect(() => {
        if (!isGameActive) return;
        const interval = setInterval(
            () => setSecondsElapsed((s) => s + 1),
            1000
        );
        return () => clearInterval(interval);
    }, [isGameActive]);

    useEffect(() => {
        if (gameCards.length > 0 && matchedCardIds.size === gameCards.length) {
            setIsGameActive(false);
        }
    }, [matchedCardIds, gameCards]);

    const handleTileClick = (tile: MatchItem) => {
        if (matchedCardIds.has(tile.cardId) || mismatchedPair) return;
        if (!selectedItem) {
            setSelectedItem(tile);
            return;
        }
        if (selectedItem.id === tile.id) {
            setSelectedItem(null);
            return;
        }
        if (
            selectedItem.cardId === tile.cardId &&
            selectedItem.type !== tile.type
        ) {
            setMatchedCardIds((prev) => new Set([...prev, tile.cardId]));
            setSelectedItem(null);
        } else {
            setMismatchedPair([selectedItem.id, tile.id]);
            setMistakes((m) => m + 1);
            setTimeout(() => {
                setMismatchedPair(null);
                setSelectedItem(null);
            }, 700);
        }
    };

    if (isLoading) {
        return (
            <div data-testid="match-loading" className="py-24 text-center text-sm">
                Loading matching game...
            </div>
        );
    }

    if (!gameCards.length) {
        return (
            <div data-testid="match-empty" className="py-16 text-center space-y-3">
                <p className="text-sm text-stone-500">Need cards to play match.</p>
                <button
                    type="button"
                    data-testid="btn-match-close"
                    onClick={() => router.push(base)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <div
            data-testid="matching-game-page"
            className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl mx-auto p-6 border"
        >
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold">
                            Matching Game: {subject?.title}
                        </h1>
                        <p className="text-xs text-stone-500">
                            Match every prompt to its definition
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono text-xs font-bold">
                        <Timer className="w-4 h-4" />
                        {Math.floor(secondsElapsed / 60)}:
                        {(secondsElapsed % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                        type="button"
                        data-testid="btn-match-close"
                        onClick={() => router.push(base)}
                        className="p-2 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {!isGameActive ? (
                <div className="py-10 text-center space-y-4">
                    <Trophy className="w-8 h-8 mx-auto text-amber-600" />
                    <h2 className="text-2xl font-black">All Cleared!</h2>
                    <p className="text-sm text-stone-500">
                        Completed in {secondsElapsed}s with {mistakes} mistakes.
                    </p>
                    <div className="flex justify-center gap-2">
                        <button
                            type="button"
                            data-testid="btn-match-restart"
                            onClick={() => {
                                setMatchedCardIds(new Set());
                                setSelectedItem(null);
                                setMismatchedPair(null);
                                setSecondsElapsed(0);
                                setMistakes(0);
                                setIsGameActive(true);
                                setShuffleKey((k) => k + 1);
                            }}
                            className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4 inline mr-1" />
                            Play Again
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/home')}
                            className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                        >
                            Return to Library
                        </button>
                    </div>
                </div>
            ) : (
                <div className="py-6 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {tiles.map((tile) => {
                            const isMatched = matchedCardIds.has(tile.cardId);
                            const isSelected = selectedItem?.id === tile.id;
                            const isMismatched = mismatchedPair?.includes(
                                tile.id
                            );
                            return (
                                <button
                                    key={tile.id}
                                    type="button"
                                    data-testid={`match-tile-${tile.id}`}
                                    disabled={isMatched}
                                    onClick={() => handleTileClick(tile)}
                                    className={`min-h-[80px] p-3 rounded-2xl border text-xs cursor-pointer ${
                                        isMatched
                                            ? 'opacity-40'
                                            : isMismatched
                                              ? 'bg-rose-50 border-rose-400'
                                              : isSelected
                                                ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]'
                                                : 'bg-stone-50'
                                    }`}
                                >
                                    {tile.text}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-stone-400">
                        <span>
                            Matched: {matchedCardIds.size} / {gameCards.length}
                        </span>
                        <span>Mistakes: {mistakes}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
