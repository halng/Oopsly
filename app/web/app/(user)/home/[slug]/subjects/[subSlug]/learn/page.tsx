'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowRight,
    Brain,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    X,
    XCircle,
} from 'lucide-react';
import { Card, Subject } from '@/types';
import { ApiService } from '@/services/api';

export default function LearnPage() {
    const params = useParams<{ shelfId: string; subjectId: string }>();
    const router = useRouter();
    const shelfId = String(params.shelfId || '');
    const subjectId = String(params.subjectId || '');
    const base = `/home/${shelfId}/subjects/${subjectId}`;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

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
            setCards(
                (cardsRes.data || []).filter((c) => !c.isDeleted)
            );
            setIsLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [subjectId]);

    const currentCard = cards[currentIndex];
    const options = useMemo(() => {
        if (!currentCard) return [];
        const correct = currentCard.back;
        const distractors = cards
            .filter((c) => c.id !== currentCard.id)
            .slice(0, 3)
            .map((c) => c.back);
        return [correct, ...distractors];
    }, [currentCard, cards]);

    if (isLoading) {
        return (
            <div data-testid="learn-loading" className="py-24 text-center text-sm">
                Loading quiz...
            </div>
        );
    }

    if (!cards.length) {
        return (
            <div data-testid="learn-empty" className="py-16 text-center space-y-3">
                <p className="text-sm text-stone-500">
                    No cards in this deck to practice.
                </p>
                <button
                    type="button"
                    data-testid="btn-learn-close"
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
            data-testid="learn-mode-page"
            className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl mx-auto p-6 border border-stone-100"
        >
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold">
                            Learn Mode: {subject?.title}
                        </h1>
                        <p className="text-xs text-stone-500">
                            Question {currentIndex + 1} of {cards.length}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid="btn-learn-close"
                    onClick={() => router.push(base)}
                    className="p-2 cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {isFinished ? (
                <div className="py-8 text-center space-y-4">
                    <Sparkles className="w-8 h-8 mx-auto text-emerald-600" />
                    <h2 className="text-2xl font-black">Quiz Completed!</h2>
                    <p className="text-sm text-stone-500">
                        You scored {correctCount} out of {cards.length} (
                        {Math.round((correctCount / cards.length) * 100)}%).
                    </p>
                    <div className="flex justify-center gap-2">
                        <button
                            type="button"
                            data-testid="btn-learn-restart"
                            onClick={() => {
                                setCurrentIndex(0);
                                setSelectedOption(null);
                                setIsAnswerSubmitted(false);
                                setCorrectCount(0);
                                setIsFinished(false);
                            }}
                            className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4 inline mr-1" />
                            Try Again
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/home')}
                            className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                        >
                            Back to Library
                        </button>
                    </div>
                </div>
            ) : (
                <div className="py-6 space-y-4">
                    <div className="p-5 bg-stone-50 rounded-2xl">
                        <span className="text-[10px] uppercase font-extrabold text-stone-400">
                            Identify the correct answer
                        </span>
                        <p className="text-lg font-extrabold mt-2">
                            {currentCard.front}
                        </p>
                    </div>
                    <div className="space-y-2">
                        {options.map((option) => {
                            const isSelected = selectedOption === option;
                            const isCorrect = option === currentCard.back;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    disabled={isAnswerSubmitted}
                                    data-testid={`btn-learn-option`}
                                    onClick={() => {
                                        if (isAnswerSubmitted) return;
                                        setSelectedOption(option);
                                        setIsAnswerSubmitted(true);
                                        if (option === currentCard.back) {
                                            setCorrectCount((p) => p + 1);
                                        }
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border text-sm cursor-pointer ${
                                        isAnswerSubmitted && isCorrect
                                            ? 'bg-emerald-50 border-emerald-500'
                                            : isAnswerSubmitted && isSelected
                                              ? 'bg-rose-50 border-rose-500'
                                              : 'bg-white'
                                    }`}
                                >
                                    <span className="flex justify-between">
                                        {option}
                                        {isAnswerSubmitted && isCorrect && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        )}
                                        {isAnswerSubmitted &&
                                            isSelected &&
                                            !isCorrect && (
                                                <XCircle className="w-5 h-5 text-rose-600" />
                                            )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {isAnswerSubmitted && (
                        <button
                            type="button"
                            data-testid="btn-learn-next"
                            onClick={() => {
                                if (currentIndex + 1 < cards.length) {
                                    setCurrentIndex((p) => p + 1);
                                    setSelectedOption(null);
                                    setIsAnswerSubmitted(false);
                                } else {
                                    setIsFinished(true);
                                }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                        >
                            {currentIndex + 1 < cards.length
                                ? 'Next Question'
                                : 'Finish Quiz'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
