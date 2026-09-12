'use client';
import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Flame, Zap } from 'lucide-react';
import { StatsData } from '@/types';
import { ApiService } from '@/services/api';

export default function StatsPage() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        ApiService.getStats()
            .then((res) => {
                if (mounted && res.isSuccess && res.data) {
                    setStats(res.data);
                }
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div
                data-testid="stats-loading"
                className="py-24 text-center text-xs"
            >
                Loading learning analytics...
            </div>
        );
    }

    const streakDays = stats?.streakDays ?? 0;
    const reviewedToday = stats?.reviewedToday ?? stats?.totalStudiedToday ?? 0;
    const dailyGoal = stats?.dailyGoal || 20;
    const retentionRate = stats?.retentionRate ?? stats?.overallRetention ?? 88;
    const totalReviews = stats?.totalReviews ?? 0;
    const stateDist = stats?.stateDistribution || {
        new: 0,
        learning: 0,
        review: 0,
        relearning: 0,
        mastered: 0,
    };
    const dailyGoalPercent = Math.min(
        100,
        Math.round((reviewedToday / dailyGoal) * 100)
    );
    const forecast =
        stats?.upcomingDueForecast && stats.upcomingDueForecast.length > 0
            ? stats.upcomingDueForecast
            : [
                  { date: 'Today', dueCount: 0 },
                  { date: '+1d', dueCount: 0 },
              ];
    const weekly = stats?.weeklyActivity || [];
    const maxDue = Math.max(...forecast.map((f) => f.dueCount), 1);

    return (
        <div data-testid="stats-page" className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-[var(--theme-accent)]" />
                    Learning Analytics
                </h1>
                <p className="text-xs text-stone-500 mt-1">
                    Retention, streaks, and scheduled intervals.
                </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border">
                    <Flame className="w-4 h-4 text-orange-500 mb-2" />
                    <div className="text-2xl font-black">{streakDays}</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                        Streak days
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-2" />
                    <div className="text-2xl font-black">{dailyGoalPercent}%</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                        Daily goal
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border">
                    <Zap className="w-4 h-4 text-amber-500 mb-2" />
                    <div className="text-2xl font-black">{retentionRate}%</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                        Retention
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border">
                    <div className="text-2xl font-black">{totalReviews}</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                        Total reviews
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-2xl border p-5">
                <h2 className="text-sm font-bold mb-3">Card states</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {Object.entries(stateDist).map(([key, value]) => (
                        <div key={key} className="p-3 rounded-xl bg-stone-50">
                            <div className="font-black">{value}</div>
                            <div className="uppercase text-[10px] text-stone-400">
                                {key}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-2xl border p-5">
                <h2 className="text-sm font-bold mb-3">Upcoming due</h2>
                <div className="flex items-end gap-2 h-32">
                    {forecast.map((item) => (
                        <div
                            key={item.date}
                            className="flex-1 flex flex-col items-center gap-1"
                        >
                            <div
                                className="w-full rounded-t bg-[var(--theme-accent)]"
                                style={{
                                    height: `${Math.max(8, (item.dueCount / maxDue) * 100)}%`,
                                }}
                            />
                            <span className="text-[10px] text-stone-400">
                                {item.dayName || item.date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {weekly.length > 0 && (
                <div className="bg-white dark:bg-stone-900 rounded-2xl border p-5">
                    <h2 className="text-sm font-bold mb-3">Weekly activity</h2>
                    <div className="space-y-2">
                        {weekly.map((day) => (
                            <div
                                key={day.day}
                                className="flex items-center justify-between text-xs"
                            >
                                <span className="font-bold w-10">{day.day}</span>
                                <span>{day.cardsReviewed} cards</span>
                                <span>{day.retention}% retention</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
