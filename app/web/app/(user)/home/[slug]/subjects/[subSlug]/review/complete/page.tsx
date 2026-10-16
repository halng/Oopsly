'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    CheckCircle2,
    Flame,
    RotateCcw,
    Timer,
    Trophy,
    Zap,
} from 'lucide-react';
import { useStudySessionStore } from '@/store';
import { useSubjectContext } from '@/hooks/useSubjectContext';
import { useStudyFx } from '@/hooks/useStudyFx';
import { StudyConfetti, StudyShell } from '@/components/study';

export default function ReviewCompletePage() {
    const router = useRouter();
    const { play } = useStudyFx();
    const lastReview = useStudySessionStore((s) => s.lastReview);
    const { subject, baseUrl, shelfUrl, isLoading } = useSubjectContext();

    const matchesSubject =
        !!lastReview && (!subject || lastReview.subjectId === subject.id);

    useEffect(() => {
        if (isLoading) return;
        if (!matchesSubject) router.replace(baseUrl);
    }, [baseUrl, isLoading, matchesSubject, router]);

    useEffect(() => {
        if (matchesSubject) play('complete');
    }, [matchesSubject, play]);

    if (!lastReview || !matchesSubject) {
        return (
            <div
                data-testid="review-complete-redirect"
                className="py-24 text-center text-sm"
            >
                Returning to subject...
            </div>
        );
    }

    const stats = lastReview;
    const presses =
        (stats.gradeCounts[1] || 0) +
        (stats.gradeCounts[2] || 0) +
        (stats.gradeCounts[3] || 0) +
        (stats.gradeCounts[4] || 0);
    const accuracyPercent =
        presses === 0
            ? 0
            : Math.round(
                  ((presses - (stats.gradeCounts[1] || 0)) / presses) * 100
              );
    const minutes = Math.max(stats.timeSpentSeconds, 1) / 60;
    const cardsPerMinute = Math.round(stats.totalReviewed / minutes);

    return (
        <StudyShell
            testId="review-complete-page"
            className="max-w-lg mx-auto p-6 sm:p-8 text-center space-y-5"
        >
            <StudyConfetti />
            <div className="w-16 h-16 rounded-3xl bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] flex items-center justify-center mx-auto study-pop">
                <Trophy className="w-8 h-8 text-[var(--theme-secondary)]" />
            </div>
            <div>
                <h1 className="text-2xl font-black">Session Completed!</h1>
                <p className="text-xs text-[var(--theme-text)]/55 mt-1">
                    Great job reinforcing{' '}
                    <span className="font-bold">{stats.subjectTitle}</span>.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                    <Zap className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div data-testid="complete-xp" className="font-black">
                        +{stats.xpEarned}
                    </div>
                    <div className="text-[10px] uppercase font-bold">XP</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div data-testid="complete-accuracy" className="font-black">
                        {accuracyPercent}%
                    </div>
                    <div className="text-[10px] uppercase font-bold">
                        Recalled
                    </div>
                </div>
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40">
                    <Flame className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <div className="font-black">{stats.totalReviewed}</div>
                    <div className="text-[10px] uppercase font-bold">Cards</div>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                    <Timer className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    <div className="font-black">{cardsPerMinute || 0}</div>
                    <div className="text-[10px] uppercase font-bold">
                        Cards / Min
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/40 font-bold">
                    {stats.gradeCounts[1] || 0}
                    <div className="text-[9px]">Again</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 font-bold">
                    {stats.gradeCounts[2] || 0}
                    <div className="text-[9px]">Hard</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 font-bold">
                    {stats.gradeCounts[3] || 0}
                    <div className="text-[9px]">Good</div>
                </div>
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/40 font-bold">
                    {stats.gradeCounts[4] || 0}
                    <div className="text-[9px]">Easy</div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                    type="button"
                    data-testid="btn-practice-again"
                    onClick={() => router.push(`${baseUrl}/review`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--theme-border)] text-xs font-bold cursor-pointer"
                >
                    <RotateCcw className="w-4 h-4" />
                    Practice Again
                </button>
                <button
                    type="button"
                    data-testid="btn-return-shelf"
                    onClick={() => router.push(shelfUrl)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold cursor-pointer"
                >
                    Back to Shelf
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </StudyShell>
    );
}
