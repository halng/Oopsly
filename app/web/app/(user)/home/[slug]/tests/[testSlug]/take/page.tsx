'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    RotateCcw,
    Send,
    Trophy,
    XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { TestAttempt, TestQuestionBreakdown, TestSubmissionRes } from '@/types';
import { ApiService } from '@/services/api';
import { GameReward, GameService } from '@/services/gameApi';

const PouchReveal = dynamic(() => import('@/components/garden/PouchReveal'), {
    ssr: false,
});
import { useTestSuiteContext } from '@/hooks/useTestSuiteContext';
import { useStudyFx } from '@/hooks/useStudyFx';
import {
    StudyHeader,
    StudyMotion,
    StudyProgress,
    StudyResultCard,
    StudyShell,
} from '@/components/study';
import QuestionRenderer, {
    QuestionAnswer,
    isAnswered,
} from '@/components/tests/QuestionRenderer';
import { QUESTION_TYPE_LABELS } from '@/utils/questionForm';
import { buildOptionOrders, buildSubmission } from '@/utils/testAttempt';
import { formatClock } from '@/utils/study';

type Phase = 'loading' | 'error' | 'taking' | 'submitting' | 'results';

function userAnswerText(b: TestQuestionBreakdown): string {
    switch (b.type) {
        case 'MULTIPLE_CHOICE':
            return (b.userAnswerIndexes ?? [])
                .map((i) => b.options[i])
                .join(', ');
        case 'FILL_IN_THE_BLANK':
            return b.userAnswerText ?? '';
        default:
            return b.userAnswerIndex == null
                ? ''
                : (b.options[b.userAnswerIndex] ?? '');
    }
}

function correctAnswerText(b: TestQuestionBreakdown): string {
    switch (b.type) {
        case 'MULTIPLE_CHOICE':
            return (b.correctOptionIndexes ?? [])
                .map((i) => b.options[i])
                .join(', ');
        case 'FILL_IN_THE_BLANK':
            return b.correctAnswerText ?? '';
        default:
            return b.correctOptionIndex == null
                ? ''
                : (b.options[b.correctOptionIndex] ?? '');
    }
}

export default function TakeTestPage() {
    const router = useRouter();
    const { play } = useStudyFx();
    const { shelf, testSuite, baseUrl, isLoading, notFound, refresh } =
        useTestSuiteContext();

    const [phase, setPhase] = useState<Phase>('loading');
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState<TestAttempt | null>(null);
    const [orders, setOrders] = useState<Record<string, number[]>>({});
    const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
    const [current, setCurrent] = useState(0);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [result, setResult] = useState<TestSubmissionRes | null>(null);
    const [pouch, setPouch] = useState<GameReward | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const startedAtRef = useRef(0);

    const shelfId = shelf?.id;
    const suiteId = testSuite?.id;

    const loadAttempt = useCallback(async () => {
        if (!shelfId || !suiteId) return;
        setPhase('loading');
        const res = await ApiService.getTestAttempt(shelfId, suiteId);
        if (!res.isSuccess || !res.data || res.data.questions.length === 0) {
            setError(
                res.isSuccess
                    ? 'This test suite has no questions yet.'
                    : res.message || 'Could not load the test.'
            );
            setPhase('error');
            return;
        }
        setAttempt(res.data);
        setOrders(buildOptionOrders(res.data.questions));
        setAnswers({});
        setCurrent(0);
        setResult(null);
        setPouch(null);
        setRemaining(res.data.timeLimitSeconds ?? null);
        startedAtRef.current = Date.now();
        setPhase('taking');
    }, [shelfId, suiteId]);

    useEffect(() => {
        queueMicrotask(() => void loadAttempt());
    }, [loadAttempt]);

    const submit = useCallback(async () => {
        if (!shelfId || !suiteId || !attempt) return;
        setPhase('submitting');
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        const res = await ApiService.submitTestSuite(
            shelfId,
            suiteId,
            buildSubmission(attempt.questions, answers, seconds)
        );
        if (!res.isSuccess || !res.data) {
            setError(
                res.message || 'Could not submit the test. Please try again.'
            );
            setPhase('taking');
            play('incorrect');
            return;
        }
        setError(null);
        setResult(res.data);
        setPhase('results');
        play(res.data.percentage >= 70 ? 'complete' : 'incorrect');
        void refresh();
        const reward = await GameService.claimTest(res.data.percentage);
        if (reward.isSuccess && reward.data) setPouch(reward.data);
    }, [answers, attempt, play, refresh, shelfId, suiteId]);

    const submitRef = useRef(submit);
    useEffect(() => {
        submitRef.current = submit;
    }, [submit]);

    const hasTimer = attempt?.timeLimitSeconds != null;
    useEffect(() => {
        if (phase !== 'taking' || !hasTimer || !attempt?.timeLimitSeconds)
            return;
        const limit = attempt.timeLimitSeconds;
        const id = setInterval(() => {
            const left = Math.max(
                0,
                limit - Math.floor((Date.now() - startedAtRef.current) / 1000)
            );
            setRemaining(left);
            if (left === 0) {
                clearInterval(id);
                void submitRef.current();
            }
        }, 250);
        return () => clearInterval(id);
    }, [attempt, hasTimer, phase]);

    const exit = () => router.push(baseUrl);

    if (notFound) {
        return (
            <div
                data-testid="take-test-not-found"
                className="py-16 text-center text-sm text-[var(--theme-text)]/60"
            >
                Test suite not found.
            </div>
        );
    }

    if (isLoading || phase === 'loading') {
        return (
            <div
                data-testid="take-test-loading"
                className="py-24 text-center text-sm text-[var(--theme-text)]/70"
            >
                Preparing your test...
            </div>
        );
    }

    if (phase === 'error' || !attempt) {
        return (
            <div
                data-testid="take-test-error"
                className="py-16 text-center space-y-3 text-[var(--theme-text)]"
            >
                <p className="text-sm text-[var(--theme-text)]/60">{error}</p>
                <button
                    type="button"
                    onClick={exit}
                    className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                >
                    Back to test suite
                </button>
            </div>
        );
    }

    const questions = attempt.questions;
    const question = questions[current];
    const answeredCount = questions.filter((q) =>
        isAnswered(q, answers[q.id])
    ).length;

    const unansweredCount = questions.length - answeredCount;

    const handleConfirmSubmit = () => {
        setConfirmOpen(false);
        void submit();
    };

    const goTo = (index: number) => {
        play('tap');
        setCurrent(index);
    };

    if (phase === 'results' && result) {
        return (
            <StudyShell testId="test-results" className="max-w-3xl mx-auto p-6">
                <StudyHeader
                    icon={<ClipboardList className="w-5 h-5" />}
                    title={attempt.title}
                    subtitle="Results"
                    onClose={exit}
                    closeTestId="btn-take-test-close"
                />
                {pouch ? (
                    <div className="mb-4">
                        <PouchReveal
                            species={pouch.species}
                            rarity={pouch.rarity}
                        />
                    </div>
                ) : null}
                <StudyResultCard
                    testId="test-results-summary"
                    icon={
                        <Trophy className="w-8 h-8 text-[var(--theme-accent)]" />
                    }
                    title={`${result.score} / ${result.totalQuestions} correct`}
                    description={`You scored ${result.percentage}% in ${formatClock(result.timeSpentSeconds)}.`}
                    xpGained={result.xpGained}
                    actions={
                        <>
                            <button
                                type="button"
                                data-testid="btn-retake-test"
                                onClick={() => void loadAttempt()}
                                className="px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4 inline mr-1" />
                                Retake
                            </button>
                            <button
                                type="button"
                                onClick={exit}
                                className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                            >
                                Back to test suite
                            </button>
                        </>
                    }
                />
                <ol className="space-y-3" data-testid="test-breakdown">
                    {result.breakdown.map((b, i) => (
                        <li
                            key={b.questionId}
                            data-testid={`breakdown-${b.questionId}`}
                            className={`p-4 rounded-2xl border text-sm study-enter ${
                                b.correct
                                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                                    : 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
                            }`}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold whitespace-pre-wrap">
                                    {i + 1}. {b.text}
                                </p>
                                {b.correct ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                )}
                            </div>
                            <p className="text-[10px] uppercase font-bold text-[var(--theme-text)]/40 mt-1">
                                {QUESTION_TYPE_LABELS[b.type]}
                            </p>
                            <p className="mt-2 text-xs">
                                Your answer:{' '}
                                <span className="font-bold">
                                    {userAnswerText(b) || 'No answer'}
                                </span>
                            </p>
                            {!b.correct && (
                                <p className="text-xs">
                                    Correct answer:{' '}
                                    <span className="font-bold text-[var(--theme-secondary)]">
                                        {correctAnswerText(b)}
                                    </span>
                                </p>
                            )}
                            {b.explanation && (
                                <p className="mt-2 text-xs text-[var(--theme-text)]/60">
                                    {b.explanation}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            </StudyShell>
        );
    }

    return (
        <StudyShell
            testId="take-test-page"
            className="max-w-5xl mx-auto p-6 space-y-5"
        >
            <StudyHeader
                icon={<ClipboardList className="w-5 h-5" />}
                title={attempt.title}
                subtitle={`Question ${current + 1} of ${questions.length} · ${answeredCount} answered`}
                seconds={remaining ?? undefined}
                onClose={exit}
                closeTestId="btn-take-test-close"
            />

            <StudyProgress
                testId="test-progress"
                segments={[
                    {
                        width:
                            (answeredCount / Math.max(questions.length, 1)) *
                            100,
                    },
                ]}
            />

            <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
                <aside
                    data-testid="test-sidebar"
                    className="space-y-4 md:sticky md:top-6 p-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-subtle)]"
                >
                    <p className="text-[10px] uppercase font-extrabold tracking-wider text-[var(--theme-text)]/45">
                        Questions
                    </p>
                    <nav
                        aria-label="Questions"
                        className="flex flex-wrap gap-1.5"
                        data-testid="question-navigator"
                    >
                        {questions.map((q, i) => {
                            const done = isAnswered(q, answers[q.id]);
                            return (
                                <button
                                    key={q.id}
                                    type="button"
                                    data-testid={`nav-question-${i}`}
                                    aria-current={i === current}
                                    onClick={() => goTo(i)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition-transform active:scale-95 ${
                                        i === current
                                            ? 'ring-2 ring-[var(--theme-accent)] scale-105'
                                            : ''
                                    } ${
                                        done
                                            ? 'bg-[var(--theme-accent)] text-white'
                                            : 'bg-[var(--theme-subtle)] text-[var(--theme-text)]'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </nav>

                    <button
                        type="button"
                        data-testid="btn-submit-test"
                        disabled={phase === 'submitting'}
                        onClick={() => setConfirmOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        {phase === 'submitting'
                            ? 'Submitting...'
                            : 'Submit test'}
                    </button>
                </aside>
                <div className="space-y-5 min-w-0">
                    <StudyMotion key={question.id} fx="enter">
                        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-subtle)] space-y-4">
                            <span className="inline-flex items-center rounded-full bg-[var(--theme-card)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--theme-text)]/45">
                                {QUESTION_TYPE_LABELS[question.type]}
                            </span>
                            <QuestionRenderer
                                question={question}
                                order={
                                    orders[question.id] ??
                                    question.options.map((_, i) => i)
                                }
                                answer={answers[question.id]}
                                disabled={phase === 'submitting'}
                                onChange={(a) => {
                                    if (question.type !== 'FILL_IN_THE_BLANK')
                                        play('tap');
                                    setAnswers((prev) => ({
                                        ...prev,
                                        [question.id]: a,
                                    }));
                                }}
                            />
                        </div>
                    </StudyMotion>

                    {error && (
                        <p
                            data-testid="take-test-submit-error"
                            className="text-xs font-semibold text-rose-600"
                        >
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--theme-border)]">
                        <button
                            type="button"
                            data-testid="btn-prev-question"
                            disabled={current === 0}
                            onClick={() => goTo(current - 1)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer disabled:opacity-40"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                        </button>
                        <button
                            type="button"
                            data-testid="btn-next-question"
                            disabled={current >= questions.length - 1}
                            onClick={() => goTo(current + 1)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {confirmOpen && (
                <div
                    data-testid="submit-confirm-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="submit-confirm-title"
                    className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setConfirmOpen(false)}
                >
                    <div
                        className="w-full max-w-sm p-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text)] space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2
                            id="submit-confirm-title"
                            className="text-base font-extrabold"
                        >
                            Submit your test?
                        </h2>
                        <p className="text-sm text-[var(--theme-text)]/70">
                            {unansweredCount > 0
                                ? `You have ${unansweredCount} unanswered question(s). You can't change your answers after submitting.`
                                : "You've answered every question. You can't change your answers after submitting."}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                data-testid="btn-cancel-submit"
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                            >
                                Keep working
                            </button>
                            <button
                                type="button"
                                data-testid="btn-confirm-submit"
                                onClick={handleConfirmSubmit}
                                className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </StudyShell>
    );
}
