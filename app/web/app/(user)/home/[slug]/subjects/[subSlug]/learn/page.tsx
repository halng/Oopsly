'use client';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    Brain,
    CheckCircle2,
    RotateCcw,
    Trophy,
    XCircle,
} from 'lucide-react';
import { Card } from '@/types';
import { ApiService } from '@/services/api';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import { useStudyFx } from '@/hooks/useStudyFx';
import {
    StudyHeader,
    StudyMotion,
    StudyProgress,
    StudyResultCard,
    StudyShell,
} from '@/components/study';
import { isAnswerCloseEnough, pickDistractors, shuffle } from '@/utils/study';
import {
    currentCardId,
    initialLearnState,
    learnProgress,
    learnReducer,
} from '@/utils/learnEngine';

const MIN_CARDS = 2;
const DISTRACTORS = 3;
const STUDY_MODE = 'LEARN' as const;

export default function LearnPage() {
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
    const [state, dispatch] = useReducer(learnReducer, initialLearnState);
    const [typed, setTyped] = useState('');
    const [xpGained, setXpGained] = useState<number | null>(null);
    const startedAtRef = useRef(0);
    const sessionIdRef = useRef<string | null>(null);
    const loggedRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastFeedbackRef = useRef<string | null>(null);

    const cardsById = useMemo(
        () => new Map(cards.map((c) => [c.id, c])),
        [cards]
    );

    const start = useCallback((list: Card[]) => {
        loggedRef.current = false;
        lastFeedbackRef.current = null;
        setXpGained(null);
        setTyped('');
        startedAtRef.current = Date.now();
        dispatch({ type: 'start', cardIds: shuffle(list.map((c) => c.id)) });
    }, []);

    const createSession = useCallback(async () => {
        if (!shelf || !subject) return null;
        const started = await ApiService.startStudySession(
            shelf.id,
            subject.id,
            STUDY_MODE
        );
        return started.isSuccess && started.data ? started.data.id : null;
    }, [shelf, subject]);

    useEffect(() => {
        if (!shelf || !subject) return;
        let cancelled = false;
        (async () => {
            const res = await ApiService.getSubjectCards(shelf.id, subject.id);
            if (cancelled) return;
            const list = res.isSuccess ? (res.data?.entities ?? []) : [];
            setCards(list);
            if (list.length >= MIN_CARDS) {
                sessionIdRef.current = await createSession();
                if (cancelled) return;
                start(list);
            }
            setIsLoadingCards(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [createSession, shelf, start, subject]);

    useEffect(() => {
        if (state.phase !== 'done' || loggedRef.current || !shelf || !subject)
            return;
        loggedRef.current = true;
        play('complete');
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
            setXpGained(0);
            return;
        }
        ApiService.logStudySession(shelf.id, subject.id, {
            sessionId,
            mode: 'LEARN',
            totalItems: state.order.length,
            correctCount: state.correctAnswers,
            mistakes: state.mistakes,
            durationSeconds: Math.max(
                1,
                Math.round((Date.now() - startedAtRef.current) / 1000)
            ),
        }).then((res) =>
            setXpGained(res.isSuccess && res.data ? res.data.xpGained : 0)
        );
    }, [
        play,
        shelf,
        state.correctAnswers,
        state.mistakes,
        state.order.length,
        state.phase,
        subject,
    ]);

    const cardId = currentCardId(state);
    const card = cardId ? cardsById.get(cardId) : undefined;
    const askedLevel = state.lastAnswer
        ? state.lastAnswer.previousLevel
        : (state.levels[cardId ?? ''] ?? 0);
    const kind = askedLevel === 0 ? 'mcq' : 'written';
    const progress = learnProgress(state);

    const options = useMemo(() => {
        if (!card) return [];
        return shuffle([
            card.back,
            ...pickDistractors(card, cards, DISTRACTORS),
        ]);
        // A new question number reshuffles even when the same card comes back.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [card, cards, state.questionNumber]);

    useEffect(() => {
        if (state.phase === 'question' && kind === 'written')
            inputRef.current?.focus();
    }, [kind, state.phase, state.questionNumber]);

    useEffect(() => {
        if (state.phase !== 'feedback' || !state.lastAnswer) return;
        const token = `${state.questionNumber}:${state.lastAnswer.correct}:${state.lastAnswer.overridden ?? false}`;
        if (lastFeedbackRef.current === token) return;
        lastFeedbackRef.current = token;
        play(state.lastAnswer.correct ? 'correct' : 'incorrect');
    }, [play, state.lastAnswer, state.phase, state.questionNumber]);

    const advance = (action: 'continue' | 'nextRound') => {
        setTyped('');
        play('tap');
        dispatch({ type: action });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            if (state.phase === 'feedback') {
                e.preventDefault();
                setTyped('');
                play('tap');
                dispatch({ type: 'continue' });
            } else if (state.phase === 'summary') {
                e.preventDefault();
                setTyped('');
                play('tap');
                dispatch({ type: 'nextRound' });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [play, state.phase]);

    const exit = () => router.push(baseUrl);
    const restart = async () => {
        sessionIdRef.current = await createSession();
        start(cards);
    };

    if (notFound) {
        return (
            <div
                data-testid="learn-not-found"
                className="py-16 text-center text-sm text-[var(--theme-text)]/60"
            >
                This subject could not be found.
            </div>
        );
    }

    if (isContextLoading || isLoadingCards) {
        return (
            <div
                data-testid="learn-loading"
                className="py-24 text-center text-sm text-[var(--theme-text)]/70"
            >
                Loading Learn mode...
            </div>
        );
    }

    if (cards.length < MIN_CARDS) {
        return (
            <div
                data-testid="learn-empty"
                className="py-16 text-center space-y-3 text-[var(--theme-text)]"
            >
                <p className="text-sm text-[var(--theme-text)]/60">
                    Learn mode needs at least {MIN_CARDS} cards in this subject.
                </p>
                <button
                    type="button"
                    data-testid="btn-learn-close"
                    onClick={exit}
                    className="px-4 py-2 bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                    Back to subject
                </button>
            </div>
        );
    }

    const submitWritten = (e: React.FormEvent) => {
        e.preventDefault();
        if (!card || state.phase !== 'question') return;
        dispatch({
            type: 'answer',
            correct: isAnswerCloseEnough(typed, card.back),
            given: typed,
        });
    };

    const last = state.lastAnswer;
    const promptFx =
        state.phase === 'feedback' && last
            ? last.correct
                ? 'pop'
                : 'shake'
            : 'enter';

    return (
        <StudyShell testId="learn-mode-page" className="max-w-2xl mx-auto p-6">
            <StudyHeader
                icon={<Brain className="w-5 h-5" />}
                title={`Learn: ${subject?.name ?? ''}`}
                subtitle={
                    state.phase === 'done'
                        ? 'All cards mastered'
                        : `Round ${state.roundNumber} · ${progress.mastered}/${progress.total} mastered`
                }
                onClose={exit}
                closeTestId="btn-learn-close"
            />

            <StudyProgress
                testId="learn-progress"
                segments={[
                    {
                        testId: 'learn-progress-mastered',
                        width:
                            (progress.mastered / Math.max(progress.total, 1)) *
                            100,
                    },
                    {
                        width:
                            (progress.learning / Math.max(progress.total, 1)) *
                            100,
                        className: 'bg-[var(--theme-secondary)]/70',
                    },
                ]}
            />

            {state.phase === 'done' && (
                <StudyResultCard
                    testId="learn-complete"
                    icon={
                        <Trophy className="w-8 h-8 text-[var(--theme-accent)]" />
                    }
                    title="You learned every card!"
                    description={`${state.correctAnswers} correct answers, ${state.mistakes} mistakes.`}
                    xpGained={xpGained}
                    stats={[
                        { label: 'Cards', value: progress.total },
                        { label: 'Rounds', value: state.roundNumber },
                        { label: 'Correct', value: state.correctAnswers },
                        { label: 'Mistakes', value: state.mistakes },
                    ]}
                    actions={
                        <>
                            <button
                                type="button"
                                data-testid="btn-learn-restart"
                                onClick={() => void restart()}
                                className="px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4 inline mr-1" />
                                Learn again
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
            )}

            {state.phase === 'summary' && (
                <div
                    data-testid="learn-round-summary"
                    className="study-fade py-6 space-y-4"
                >
                    <h2 className="text-xl font-black text-center">
                        Round {state.roundNumber} complete
                    </h2>
                    <p className="text-center text-sm text-[var(--theme-text)]/55">
                        {progress.mastered} mastered · {progress.learning}{' '}
                        learning · {progress.fresh} new
                    </p>
                    <ul className="space-y-1.5">
                        {state.roundResults.map((result, i) => {
                            const c = cardsById.get(result.cardId);
                            return (
                                <li
                                    key={`${result.cardId}-${i}`}
                                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--theme-subtle)] text-sm"
                                >
                                    <span className="truncate">{c?.front}</span>
                                    {result.correct ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <button
                        type="button"
                        data-testid="btn-learn-next-round"
                        onClick={() => advance('nextRound')}
                        className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                    >
                        Continue to round {state.roundNumber + 1}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {(state.phase === 'question' || state.phase === 'feedback') &&
                card && (
                    <StudyMotion
                        key={state.questionNumber}
                        fx={promptFx}
                        className="py-6 space-y-4"
                    >
                        <div className="p-6 sm:p-8 min-h-[160px] bg-[var(--theme-subtle)] rounded-3xl border border-[var(--theme-border)] text-center flex flex-col justify-center">
                            <span className="inline-flex self-center items-center rounded-full bg-[var(--theme-card)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--theme-text)]/45">
                                {kind === 'mcq'
                                    ? 'Choose the matching answer'
                                    : 'Type the answer'}
                            </span>
                            <p
                                data-testid="learn-prompt"
                                className="text-xl sm:text-2xl font-black mt-4 whitespace-pre-wrap"
                            >
                                {card.front}
                            </p>
                        </div>

                        {kind === 'mcq' ? (
                            <div className="space-y-2">
                                {options.map((option, i) => {
                                    const isAnswer = option === card.back;
                                    const isPicked = last?.given === option;
                                    const reveal = state.phase === 'feedback';
                                    const style =
                                        reveal && isAnswer
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 study-pop'
                                            : reveal && isPicked
                                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500'
                                              : 'bg-[var(--theme-card)] hover:border-[var(--theme-accent)]';
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            disabled={reveal}
                                            data-testid="btn-learn-option"
                                            onClick={() =>
                                                dispatch({
                                                    type: 'answer',
                                                    correct: isAnswer,
                                                    given: option,
                                                })
                                            }
                                            className={`w-full text-left p-4 rounded-2xl border border-[var(--theme-border)] text-sm cursor-pointer disabled:cursor-default transition-transform active:scale-[0.99] ${style}`}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-[var(--theme-subtle)] text-[10px] font-black flex items-center justify-center shrink-0">
                                                        {String.fromCharCode(
                                                            65 + i
                                                        )}
                                                    </span>
                                                    {option}
                                                </span>
                                                {reveal && isAnswer && (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                )}
                                                {reveal &&
                                                    isPicked &&
                                                    !isAnswer && (
                                                        <XCircle className="w-5 h-5 text-rose-600" />
                                                    )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <form
                                onSubmit={submitWritten}
                                className="space-y-2"
                            >
                                <input
                                    ref={inputRef}
                                    data-testid="learn-written-input"
                                    value={
                                        state.phase === 'feedback'
                                            ? (last?.given ?? '')
                                            : typed
                                    }
                                    onChange={(e) => setTyped(e.target.value)}
                                    disabled={state.phase === 'feedback'}
                                    placeholder="Type your answer"
                                    className="w-full px-4 py-3.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-base outline-none focus:border-[var(--theme-accent)]"
                                />
                                {state.phase === 'question' && (
                                    <button
                                        type="submit"
                                        data-testid="btn-learn-submit"
                                        disabled={!typed.trim()}
                                        className="px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                                    >
                                        Check answer
                                    </button>
                                )}
                            </form>
                        )}

                        {state.phase === 'feedback' && last && (
                            <div
                                data-testid="learn-feedback"
                                className={`p-4 rounded-2xl text-sm study-fade ${
                                    last.correct
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                                }`}
                            >
                                <p className="font-bold">
                                    {last.correct
                                        ? last.overridden
                                            ? 'Marked as correct.'
                                            : 'Correct!'
                                        : 'Not quite.'}
                                </p>
                                {!last.correct && (
                                    <p className="mt-1">
                                        Correct answer:{' '}
                                        <span className="font-bold">
                                            {card.back}
                                        </span>
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        data-testid="btn-learn-next"
                                        onClick={() => advance('continue')}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                                    >
                                        Continue
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                    {!last.correct && kind === 'written' && (
                                        <button
                                            type="button"
                                            data-testid="btn-learn-override"
                                            onClick={() =>
                                                dispatch({ type: 'override' })
                                            }
                                            className="px-4 py-2 rounded-xl border border-current text-xs font-bold cursor-pointer"
                                        >
                                            I was right
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </StudyMotion>
                )}
        </StudyShell>
    );
}
