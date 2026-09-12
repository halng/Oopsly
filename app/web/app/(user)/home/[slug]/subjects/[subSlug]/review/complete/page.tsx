'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function ReviewCompletePage() {
    const params = useParams<{ shelfId: string; subjectId: string }>();
    const router = useRouter();
    const lastReview = useStudySessionStore((s) => s.lastReview);
    const shelfId = String(params.shelfId || '');
    const subjectId = String(params.subjectId || '');
    const base = `/home/${shelfId}/subjects/${subjectId}`;

    const stats = lastReview || {
        totalReviewed: 0,
        xpEarned: 0,
        gradeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
        timeSpentSeconds: 1,
        subjectTitle: 'Subject',
        subjectId,
        shelfId,
    };
    const total = stats.totalReviewed || 1;
    const accuracyPercent = Math.round(
        (((stats.gradeCounts[3] || 0) + (stats.gradeCounts[4] || 0)) / total) *
            100
    );
    const timeSpentMins = (stats.timeSpentSeconds || 1) / 60;
    const cardsPerMinute = Math.round(stats.totalReviewed / timeSpentMins);

    return (
        <div
            data-testid="review-complete-page"
            className="max-w-lg mx-auto bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-100 dark:border-stone-800 text-center space-y-5"
        >
            <div className="w-16 h-16 rounded-3xl bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-[var(--theme-secondary)]" />
            </div>
            <div>
                <h1 className="text-2xl font-black">Session Completed!</h1>
                <p className="text-xs text-stone-500 mt-1">
                    Great job reinforcing{' '}
                    <span className="font-bold">{stats.subjectTitle}</span>.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-emerald-50">
                    <Zap className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="font-black">+{stats.xpEarned}</div>
                    <div className="text-[10px] uppercase font-bold">XP</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div className="font-black">{accuracyPercent}%</div>
                    <div className="text-[10px] uppercase font-bold">Accuracy</div>
                </div>
                <div className="p-3 rounded-2xl bg-sky-50">
                    <Flame className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <div className="font-black">{stats.totalReviewed}</div>
                    <div className="text-[10px] uppercase font-bold">Cards</div>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50">
                    <Timer className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    <div className="font-black">{cardsPerMinute || 0}</div>
                    <div className="text-[10px] uppercase font-bold">
                        Cards / Min
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-rose-100 font-bold">
                    {stats.gradeCounts[1] || 0}
                    <div className="text-[9px]">Again</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-100 font-bold">
                    {stats.gradeCounts[2] || 0}
                    <div className="text-[9px]">Hard</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 font-bold">
                    {stats.gradeCounts[3] || 0}
                    <div className="text-[9px]">Good</div>
                </div>
                <div className="p-2 rounded-xl bg-sky-100 font-bold">
                    {stats.gradeCounts[4] || 0}
                    <div className="text-[9px]">Easy</div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                    type="button"
                    data-testid="btn-practice-again"
                    onClick={() => router.push(`${base}/review`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold cursor-pointer"
                >
                    <RotateCcw className="w-4 h-4" />
                    Practice Again
                </button>
                <button
                    type="button"
                    data-testid="btn-return-shelf"
                    onClick={() => router.push('/home')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                >
                    Return to Library
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
