'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Lightbulb,
    RotateCw,
    Timer,
    Volume2,
    VolumeX,
    WifiOff,
    Zap,
} from 'lucide-react';
import { Card, Grade, Subject } from '@/types';
import { ApiService } from '@/services/api';
import { formatInterval, scheduleCard } from '@/utils/fsrs';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useStudySessionStore } from '@/store';

export default function ReviewPage() {
    const params = useParams<{ shelfId: string; subjectId: string }>();
    const router = useRouter();
    const { isOnline } = useSyncStatus();
    const setLastReview = useStudySessionStore((s) => s.setLastReview);
    const shelfId = String(params.shelfId || '');
    const subjectId = String(params.subjectId || '');
    const base = `/home/${shelfId}/subjects/${subjectId}`;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [sessionXp, setSessionXp] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoTTS, setIsAutoTTS] = useState(false);
    const sessionStartTimeRef = useRef<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [gradeCounts, setGradeCounts] = useState<Record<Grade, number>>({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
    });

    useEffect(() => {
        sessionStartTimeRef.current = Date.now();
        const timer = setInterval(() => {
            const started = sessionStartTimeRef.current ?? Date.now();
            setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const [subjectRes, dueRes] = await Promise.all([
                ApiService.getSubject(subjectId),
                ApiService.getDueCards(subjectId),
            ]);
            if (!mounted) return;
            if (subjectRes.isSuccess && subjectRes.data) {
                setSubject(subjectRes.data);
            }
            let nextCards = dueRes.isSuccess ? dueRes.data || [] : [];
            if (nextCards.length === 0) {
                const allRes = await ApiService.getSubjectCards(subjectId);
                nextCards = allRes.isSuccess
                    ? (allRes.data || []).filter((c) => !c.isDeleted)
                    : [];
            }
            setCards(nextCards);
            setIsLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [subjectId]);

    const currentCard = cards[currentIndex];
    const progressPercent =
        cards.length > 0 ? Math.round((currentIndex / cards.length) * 100) : 0;

    const fallbackIntervals = { 1: '< 10m', 2: '1d', 3: '3d', 4: '7d' };
    const intervals = (() => {
        if (!currentCard) return fallbackIntervals;
        try {
            const state = {
                stability: currentCard.stability || 0,
                difficulty: currentCard.difficulty || 5,
                intervalDays: currentCard.intervalDays || 0,
                repetitions: currentCard.repetitions || 0,
            };
            return {
                1: formatInterval(scheduleCard(state, 1).intervalDays),
                2: formatInterval(scheduleCard(state, 2).intervalDays),
                3: formatInterval(scheduleCard(state, 3).intervalDays),
                4: formatInterval(scheduleCard(state, 4).intervalDays),
            };
        } catch {
            return fallbackIntervals;
        }
    })();

    const finishSession = useCallback(
        (stats: {
            totalReviewed: number;
            xpEarned: number;
            gradeCounts: Record<Grade, number>;
            timeSpentSeconds: number;
        }) => {
            setLastReview({
                ...stats,
                subjectTitle: subject?.title || 'Subject',
                subjectId,
                shelfId,
            });
            router.push(`${base}/review/complete`);
        },
        [base, router, setLastReview, shelfId, subject?.title, subjectId]
    );

    const handleGrade = async (grade: Grade) => {
        if (!currentCard || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await ApiService.gradeCard(currentCard.id, grade);
            const gained =
                res.data?.xpGained ||
                (grade === 4 ? 20 : grade === 3 ? 15 : grade === 2 ? 10 : 5);
            const nextXp = sessionXp + gained;
            const nextCounts = {
                ...gradeCounts,
                [grade]: gradeCounts[grade] + 1,
            };
            setSessionXp(nextXp);
            setGradeCounts(nextCounts);
            if (currentIndex + 1 < cards.length) {
                setIsFlipped(false);
                setShowHint(false);
                setCurrentIndex((prev) => prev + 1);
            } else {
                finishSession({
                    totalReviewed: cards.length,
                    xpEarned: nextXp,
                    gradeCounts: nextCounts,
                    timeSpentSeconds: Math.floor(
                        (Date.now() -
                            (sessionStartTimeRef.current ?? Date.now())) /
                            1000
                    ),
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped((prev) => !prev);
            } else if (isFlipped) {
                if (e.key === '1') handleGrade(1);
                else if (e.key === '2') handleGrade(2);
                else if (e.key === '3') handleGrade(3);
                else if (e.key === '4') handleGrade(4);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    if (isLoading) {
        return (
            <div data-testid="review-loading" className="py-24 text-center text-sm">
                Loading review session...
            </div>
        );
    }

    if (!currentCard) {
        return (
            <div
                data-testid="review-empty"
                className="py-16 text-center space-y-3"
            >
                <p className="text-sm text-stone-500">No cards due right now.</p>
                <button
                    type="button"
                    data-testid="btn-exit-review"
                    onClick={() => router.push(base)}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                    Back to subject
                </button>
            </div>
        );
    }

    return (
        <div data-testid="flashcard-review-screen" className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl px-3 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-testid="btn-exit-review"
                        onClick={() => router.push(base)}
                        className="p-2 rounded-xl hover:bg-stone-100 cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold">
                            {subject?.title || 'Review'}
                        </h1>
                        <p className="text-xs text-stone-500">
                            Card {currentIndex + 1} of {cards.length}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden sm:flex items-center gap-1 font-mono text-xs">
                        <Timer className="w-3.5 h-3.5" />
                        {Math.floor(elapsedSeconds / 60)
                            .toString()
                            .padStart(2, '0')}
                        :{(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <Zap className="w-3.5 h-3.5" />+{sessionXp} XP
                    </span>
                </div>
            </div>

            <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-[var(--theme-accent)]"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {!isOnline && (
                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs flex items-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    Offline Mode · reviews are queued locally.
                </div>
            )}

            <button
                type="button"
                data-testid="flashcard-box"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="w-full min-h-[260px] bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 p-6 text-center cursor-pointer"
            >
                <div className="flex justify-between text-xs">
                    <span>{isFlipped ? 'Answer' : 'Prompt'}</span>
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsAutoTTS((prev) => !prev);
                        }}
                    >
                        {isAutoTTS ? (
                            <Volume2 className="w-4 h-4" />
                        ) : (
                            <VolumeX className="w-4 h-4" />
                        )}
                    </span>
                </div>
                <p className="text-2xl font-bold mt-10">
                    {isFlipped ? currentCard.back : currentCard.front}
                </p>
                {!isFlipped && currentCard.hint && (
                    <div className="mt-4">
                        {showHint ? (
                            <p className="text-xs text-amber-700">
                                Hint: {currentCard.hint}
                            </p>
                        ) : (
                            <span
                                data-testid="btn-reveal-hint"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowHint(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold"
                            >
                                <Lightbulb className="w-3.5 h-3.5" />
                                Reveal Hint
                            </span>
                        )}
                    </div>
                )}
                <div className="mt-8 text-xs text-stone-400 flex items-center justify-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" />
                    Click or press Space to flip
                </div>
            </button>

            {isFlipped && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as Grade[]).map((grade) => (
                        <button
                            key={grade}
                            type="button"
                            data-testid={`btn-grade-${grade}`}
                            disabled={isSubmitting}
                            onClick={() => handleGrade(grade)}
                            className="py-3 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                            {grade === 1
                                ? 'Again'
                                : grade === 2
                                  ? 'Hard'
                                  : grade === 3
                                    ? 'Good'
                                    : 'Easy'}
                            <div className="text-[10px] text-stone-400">
                                {intervals[grade]}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
