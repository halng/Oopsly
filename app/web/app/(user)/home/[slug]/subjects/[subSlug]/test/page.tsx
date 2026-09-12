'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowRight,
    CheckCircle2,
    FileCheck2,
    Sparkles,
    Timer,
    X,
    XCircle,
} from 'lucide-react';
import { Question, Subject } from '@/types';
import { ApiService } from '@/services/api';

export default function TestPage() {
    const params = useParams<{ shelfId: string; subjectId: string }>();
    const router = useRouter();
    const shelfId = String(params.shelfId || '');
    const subjectId = String(params.subjectId || '');
    const base = `/home/${shelfId}/subjects/${subjectId}`;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
    const [secondsRemaining, setSecondsRemaining] = useState(600);
    const [results, setResults] = useState<{
        score: number;
        totalQuestions: number;
        percentage: number;
        xpGained: number;
        breakdown: {
            prompt: string;
            isCorrect: boolean;
            explanation?: string;
        }[];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            const nestedCards = subjectRes.data?.cards || [];
            const fetchedCards = cardsRes.isSuccess ? cardsRes.data || [] : [];
            const cards = (fetchedCards.length ? fetchedCards : nestedCards).filter(
                (c) => !c.isDeleted
            );
            const generated: Question[] = cards.slice(0, 5).map((card, idx) => {
                const other = cards.filter((c) => c.id !== card.id);
                const distractors = other.slice(0, 3).map((c) => c.back);
                const allOpts = [card.back, ...distractors];
                return {
                    id: `q-gen-${idx}`,
                    testSuiteId: 'ts-default',
                    prompt: card.front,
                    options: allOpts,
                    correctOptionIndex: 0,
                    explanation: `Correct definition: ${card.back}`,
                };
            });
            setQuestions(generated);
            setIsLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [subjectId]);

    useEffect(() => {
        if (results !== null || secondsRemaining <= 0) return;
        const timer = setInterval(() => {
            setSecondsRemaining((s) => {
                if (s <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [results, secondsRemaining]);

    const handleSubmit = () => {
        let score = 0;
        const breakdown = questions.map((q) => {
            const isCorrect = userAnswers[q.id] === q.correctOptionIndex;
            if (isCorrect) score += 1;
            return {
                prompt: q.prompt,
                isCorrect,
                explanation: q.explanation,
            };
        });
        const total = questions.length || 1;
        setResults({
            score,
            totalQuestions: questions.length,
            percentage: Math.round((score / total) * 100),
            xpGained: score * 25 + 50,
            breakdown,
        });
    };

    if (isLoading) {
        return (
            <div data-testid="test-loading" className="py-24 text-center text-sm">
                Loading practice test...
            </div>
        );
    }

    if (!questions.length) {
        return (
            <div data-testid="test-empty" className="py-16 text-center space-y-3">
                <p className="text-sm text-stone-500">No cards to test yet.</p>
                <button
                    type="button"
                    data-testid="btn-test-close"
                    onClick={() => router.push(base)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                    Close
                </button>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIndex];

    return (
        <div
            data-testid="test-suite-page"
            className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl mx-auto p-6 border"
        >
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold">
                            Practice Test: {subject?.title}
                        </h1>
                        <p className="text-xs text-stone-500">
                            {results
                                ? 'Test Results'
                                : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {results === null && (
                        <span className="flex items-center gap-1 font-mono text-xs font-bold">
                            <Timer className="w-4 h-4" />
                            {Math.floor(secondsRemaining / 60)}:
                            {(secondsRemaining % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                    <button
                        type="button"
                        data-testid="btn-test-close"
                        onClick={() => router.push(base)}
                        className="p-2 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {results ? (
                <div className="py-6 space-y-4">
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="text-xs font-bold uppercase text-emerald-800">
                            Assessment Final Score
                        </div>
                        <div className="text-3xl font-black mt-1">
                            {results.score} / {results.totalQuestions} (
                            {results.percentage}%)
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm font-bold text-emerald-800">
                            <Sparkles className="w-4 h-4" />+{results.xpGained} XP
                        </div>
                    </div>
                    {results.breakdown.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-2xl border ${
                                item.isCorrect
                                    ? 'border-emerald-200 bg-emerald-50/40'
                                    : 'border-rose-200 bg-rose-50/40'
                            }`}
                        >
                            <div className="flex justify-between gap-3 text-xs font-bold">
                                <span>
                                    Q{idx + 1}. {item.prompt}
                                </span>
                                {item.isCorrect ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                )}
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        data-testid="btn-test-done"
                        onClick={() => router.push('/home')}
                        className="px-6 py-2.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            ) : (
                <div className="py-6 space-y-4">
                    <p className="text-lg font-extrabold">{currentQ.prompt}</p>
                    <div className="space-y-2">
                        {currentQ.options.map((opt, idx) => (
                            <button
                                key={`${currentQ.id}-${idx}`}
                                type="button"
                                data-testid={`btn-test-option-${idx}`}
                                onClick={() =>
                                    setUserAnswers((prev) => ({
                                        ...prev,
                                        [currentQ.id]: idx,
                                    }))
                                }
                                className={`w-full text-left p-4 rounded-2xl border text-sm cursor-pointer ${
                                    userAnswers[currentQ.id] === idx
                                        ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)]'
                                        : 'bg-white'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between">
                        <button
                            type="button"
                            disabled={currentQuestionIndex === 0}
                            onClick={() =>
                                setCurrentQuestionIndex((i) => Math.max(0, i - 1))
                            }
                            className="text-xs font-bold cursor-pointer disabled:opacity-40"
                        >
                            Previous
                        </button>
                        {currentQuestionIndex + 1 < questions.length ? (
                            <button
                                type="button"
                                data-testid="btn-test-next"
                                onClick={() =>
                                    setCurrentQuestionIndex((i) => i + 1)
                                }
                                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                data-testid="btn-test-submit"
                                onClick={handleSubmit}
                                className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                            >
                                Submit Test
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
