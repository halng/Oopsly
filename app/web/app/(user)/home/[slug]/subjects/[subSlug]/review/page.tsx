'use client';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
    Brain,
    Lightbulb,
    PartyPopper,
    Undo2,
    Volume2,
    VolumeX,
    WifiOff,
    Zap,
} from 'lucide-react';
import { Card, Grade } from '@/types';
import { ApiService } from '@/services/api';
import { formatInterval, scheduleCard } from '@/utils/fsrs';
import {
    applyGrade,
    buildReviewQueue,
    countQueue,
    FALLBACK_XP,
    nextDueDate,
    QueueItem,
} from '@/utils/reviewQueue';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import { useStudyFx } from '@/hooks/useStudyFx';
import { useStudySessionStore } from '@/store';
import {
    StudyConfetti,
    StudyFlashcard,
    StudyFx,
    StudyHeader,
    StudyMotion,
    StudyProgress,
    StudyShell,
} from '@/components/study';

const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_NEW_PER_DAY = 10;
const GRADES: Grade[] = [1, 2, 3, 4];
const GRADE_LABELS: Record<Grade, string> = {
    1: 'Again',
    2: 'Hard',
    3: 'Good',
    4: 'Easy',
};
const GRADE_STYLES: Record<Grade, string> = {
    1: 'border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40',
    2: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40',
    3: 'border-[var(--theme-accent)] text-[var(--theme-secondary)] hover:bg-[color-mix(in_srgb,var(--theme-accent)_12%,transparent)]',
    4: 'border-sky-300 text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40',
};
const GRADE_FX: Record<Grade, StudyFx> = {
    1: 'shake',
    2: 'fade',
    3: 'pop',
    4: 'glow',
};
const EMPTY_COUNTS: Record<Grade, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

interface SessionSnapshot {
    queue: QueueItem[];
    sessionXp: number;
    gradeCounts: Record<Grade, number>;
}

function previewIntervals(card: Card): Record<Grade, string> {
    const state = {
        stability: card.stability || 0,
        difficulty: card.difficulty || 5,
        intervalDays: card.intervalDays || 0,
        repetitions: card.repetitions || 0,
    };
    return {
        1: formatInterval(scheduleCard(state, 1).intervalDays),
        2: formatInterval(scheduleCard(state, 2).intervalDays),
        3: formatInterval(scheduleCard(state, 3).intervalDays),
        4: formatInterval(scheduleCard(state, 4).intervalDays),
    };
}

function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export default function ReviewPage() {
    const router = useRouter();
    const { isOnline } = useSyncStatus();
    const { play } = useStudyFx();
    const setLastReview = useStudySessionStore((s) => s.setLastReview);
    const {
        shelf,
        subject,
        baseUrl,
        isLoading: isContextLoading,
        notFound,
    } = useSubjectContext();

    const [phase, setPhase] = useState<'loading' | 'session' | 'done'>(
        'loading'
    );
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [nextDue, setNextDue] = useState<Date | null>(null);
    const [sessionSize, setSessionSize] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoTTS, setIsAutoTTS] = useState(false);
    const [sessionXp, setSessionXp] = useState(0);
    const [gradeCounts, setGradeCounts] =
        useState<Record<Grade, number>>(EMPTY_COUNTS);
    const [undoSnapshot, setUndoSnapshot] = useState<SessionSnapshot | null>(
        null
    );
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [cardFx, setCardFx] = useState<StudyFx>('enter');
    const startedAtRef = useRef<number>(0);

    const startSession = useCallback((items: QueueItem[]) => {
        setQueue(items);
        setSessionSize(items.length);
        setSessionXp(0);
        setGradeCounts(EMPTY_COUNTS);
        setUndoSnapshot(null);
        setIsFlipped(false);
        setShowHint(false);
        setCardFx('enter');
        startedAtRef.current = Date.now();
        setElapsedSeconds(0);
        setPhase('session');
    }, []);

    const showDoneScreen = useCallback(async () => {
        if (!shelf || !subject) return;
        const all = await ApiService.getSubjectCards(shelf.id, subject.id);
        setNextDue(
            nextDueDate(all.isSuccess ? (all.data?.entities ?? []) : [])
        );
        play('complete');
        setPhase('done');
    }, [play, shelf, subject]);

    useEffect(() => {
        if (!shelf || !subject) return;
        let cancelled = false;
        (async () => {
            const reviewLimit = subject.dailyLimit ?? DEFAULT_DAILY_LIMIT;
            const newLimit = subject.newCardsPerDay ?? DEFAULT_NEW_PER_DAY;
            const res = await ApiService.getDueCards(
                shelf.id,
                subject.id,
                reviewLimit,
                newLimit
            );
            if (cancelled) return;
            const items = buildReviewQueue(
                res.isSuccess ? (res.data ?? []) : [],
                {
                    reviewLimit,
                    newLimit,
                }
            );
            if (items.length > 0) startSession(items);
            else await showDoneScreen();
        })();
        return () => {
            cancelled = true;
        };
    }, [shelf, subject, startSession, showDoneScreen]);

    useEffect(() => {
        if (phase !== 'session') return;
        const timer = setInterval(() => {
            setElapsedSeconds(
                Math.floor((Date.now() - startedAtRef.current) / 1000)
            );
        }, 1000);
        return () => clearInterval(timer);
    }, [phase]);

    const current = queue[0];
    const counts = useMemo(() => countQueue(queue), [queue]);
    const intervals = useMemo(
        () => (current ? previewIntervals(current.card) : null),
        [current]
    );

    useEffect(() => {
        if (!isAutoTTS || !current) return;
        speak(isFlipped ? current.card.back : current.card.front);
    }, [isAutoTTS, current, isFlipped]);

    const finishSession = useCallback(
        (xpEarned: number, counts: Record<Grade, number>) => {
            if (!shelf || !subject) return;
            setLastReview({
                totalReviewed: sessionSize,
                xpEarned,
                gradeCounts: counts,
                timeSpentSeconds: Math.floor(
                    (Date.now() - startedAtRef.current) / 1000
                ),
                subjectTitle: subject.name,
                subjectId: subject.id,
                shelfId: shelf.id,
            });
            router.push(`${baseUrl}/review/complete`);
        },
        [baseUrl, router, sessionSize, setLastReview, shelf, subject]
    );

    const handleFlip = useCallback(() => {
        play('flip');
        setIsFlipped((prev) => !prev);
    }, [play]);

    const handleGrade = useCallback(
        async (grade: Grade) => {
            if (!current || !shelf || !subject || isSubmitting || !isFlipped)
                return;
            setIsSubmitting(true);
            setCardFx(GRADE_FX[grade]);
            play(grade === 1 ? 'incorrect' : grade >= 3 ? 'correct' : 'tap');
            try {
                const res = await ApiService.gradeCard(
                    shelf.id,
                    subject.id,
                    current.card.id,
                    grade
                );
                const gained = res.data?.xpGained || FALLBACK_XP[grade];
                const nextXp = sessionXp + gained;
                const nextCounts = {
                    ...gradeCounts,
                    [grade]: gradeCounts[grade] + 1,
                };
                const nextQueue = applyGrade(queue, grade, res.data?.card);

                if (nextQueue.length === 0) {
                    finishSession(nextXp, nextCounts);
                    return;
                }
                setUndoSnapshot({ queue, sessionXp, gradeCounts });
                setQueue(nextQueue);
                setSessionXp(nextXp);
                setGradeCounts(nextCounts);
                setIsFlipped(false);
                setShowHint(false);
                setCardFx('enter');
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            current,
            finishSession,
            gradeCounts,
            isFlipped,
            isSubmitting,
            play,
            queue,
            sessionXp,
            shelf,
            subject,
        ]
    );

    const handleUndo = useCallback(() => {
        if (!undoSnapshot) return;
        setQueue(undoSnapshot.queue);
        setSessionXp(undoSnapshot.sessionXp);
        setGradeCounts(undoSnapshot.gradeCounts);
        setUndoSnapshot(null);
        setIsFlipped(true);
        setCardFx('enter');
        play('tap');
    }, [play, undoSnapshot]);

    const handleReviewAll = useCallback(async () => {
        if (!shelf || !subject) return;
        setPhase('loading');
        const res = await ApiService.getSubjectCards(shelf.id, subject.id);
        const items = buildReviewQueue(
            res.isSuccess ? (res.data?.entities ?? []) : []
        );
        if (items.length > 0) startSession(items);
        else setPhase('done');
    }, [shelf, subject, startSession]);

    useEffect(() => {
        if (phase !== 'session') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName))
                return;
            if (e.code === 'Space') {
                e.preventDefault();
                handleFlip();
            } else if (['1', '2', '3', '4'].includes(e.key)) {
                handleGrade(Number(e.key) as Grade);
            } else if (
                e.key === 'u' ||
                (e.key === 'z' && (e.metaKey || e.ctrlKey))
            ) {
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFlip, handleGrade, handleUndo, phase]);

    const exit = () => router.push(baseUrl);

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

    if (isContextLoading || phase === 'loading') {
        return (
            <div
                data-testid="review-loading"
                className="py-24 text-center text-sm text-[var(--theme-text)]/70"
            >
                Loading review session...
            </div>
        );
    }

    if (phase === 'done' || !current) {
        return (
            <div
                data-testid="review-empty"
                className="py-16 text-center space-y-4 text-[var(--theme-text)]"
            >
                <StudyConfetti />
                <PartyPopper className="w-10 h-10 mx-auto text-[var(--theme-accent)] study-pop" />
                <h2 className="text-xl font-black">
                    Congratulations, done for today!
                </h2>
                <p className="text-sm text-[var(--theme-text)]/60">
                    {nextDue
                        ? `Next card is due ${nextDue.toLocaleString()}.`
                        : 'No reviews are scheduled yet.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        data-testid="btn-review-all"
                        onClick={handleReviewAll}
                        className="px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                    >
                        Custom study: review all
                    </button>
                    <button
                        type="button"
                        data-testid="btn-exit-review"
                        onClick={exit}
                        className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                    >
                        Back to subject
                    </button>
                </div>
            </div>
        );
    }

    const { card } = current;

    return (
        <StudyShell
            testId="flashcard-review-screen"
            className="p-4 sm:p-6 space-y-4"
        >
            <StudyHeader
                icon={<Brain className="w-5 h-5" />}
                title={subject?.name || 'Review'}
                subtitle={
                    <span
                        data-testid="review-counts"
                        className="flex gap-3 font-bold"
                    >
                        <span className="text-sky-600" title="New">
                            {counts.new} new
                        </span>
                        <span className="text-rose-600" title="Learning">
                            {counts.learning} learning
                        </span>
                        <span className="text-emerald-600" title="Review">
                            {counts.review} review
                        </span>
                    </span>
                }
                seconds={elapsedSeconds}
                extra={
                    <span className="flex items-center gap-1 text-xs font-bold text-[var(--theme-secondary)]">
                        <Zap className="w-3.5 h-3.5" />+{sessionXp} XP
                    </span>
                }
                onClose={exit}
                closeTestId="btn-exit-review"
            />

            <StudyProgress
                testId="review-progress"
                segments={[
                    {
                        width:
                            (Math.max(sessionSize - queue.length, 0) /
                                Math.max(sessionSize, 1)) *
                            100,
                    },
                ]}
            />

            {!isOnline && (
                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    Offline Mode · reviews are queued locally.
                </div>
            )}

            <StudyMotion key={card.id} fx={cardFx}>
                <StudyFlashcard
                    front={card.front}
                    back={card.back}
                    flipped={isFlipped}
                    onFlip={handleFlip}
                    toolbar={
                        <button
                            type="button"
                            data-testid="btn-toggle-tts"
                            aria-label={
                                isAutoTTS
                                    ? 'Turn off read aloud'
                                    : 'Turn on read aloud'
                            }
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsAutoTTS((prev) => !prev);
                            }}
                            className="cursor-pointer text-[var(--theme-text)]/60 hover:text-[var(--theme-accent)]"
                        >
                            {isAutoTTS ? (
                                <Volume2 className="w-4 h-4" />
                            ) : (
                                <VolumeX className="w-4 h-4" />
                            )}
                        </button>
                    }
                    frontExtra={
                        !isFlipped && card.hint ? (
                            <div className="mt-4">
                                {showHint ? (
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Hint: {card.hint}
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        data-testid="btn-reveal-hint"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowHint(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer text-[var(--theme-accent)]"
                                    >
                                        <Lightbulb className="w-3.5 h-3.5" />
                                        Reveal Hint
                                    </button>
                                )}
                            </div>
                        ) : null
                    }
                />
            </StudyMotion>

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    data-testid="btn-undo"
                    disabled={!undoSnapshot || isSubmitting}
                    onClick={handleUndo}
                    title="Undo last grade (U). The server keeps the original review."
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--theme-text)]/55 hover:bg-[var(--theme-subtle)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                    <Undo2 className="w-3.5 h-3.5" />
                    Undo
                </button>
                <span className="text-[10px] text-[var(--theme-text)]/40">
                    Flip · 1–4 grade · U undo
                </span>
            </div>

            {isFlipped && intervals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 study-fade">
                    {GRADES.map((grade) => (
                        <button
                            key={grade}
                            type="button"
                            data-testid={`btn-grade-${grade}`}
                            disabled={isSubmitting}
                            onClick={() => handleGrade(grade)}
                            className={`py-3.5 rounded-2xl border bg-[var(--theme-card)] text-sm font-bold cursor-pointer disabled:opacity-50 transition-transform active:scale-[0.97] ${GRADE_STYLES[grade]}`}
                        >
                            {GRADE_LABELS[grade]}
                            <div className="text-[10px] font-medium opacity-70">
                                {intervals[grade]}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </StudyShell>
    );
}
