'use client';
import React, { useEffect, useState } from 'react';
import { Flower2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import {
    loadGardenState,
    PLANT_SPECIES_CATALOG,
    saveGardenState,
} from '@/utils/gardenData';
import { GardenState } from '@/types';

export default function StudyPage() {
    const [tab, setTab] = useState<'timer' | 'garden'>('timer');
    const [minutes, setMinutes] = useState(25);
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [garden, setGarden] = useState<GardenState | null>(null);

    useEffect(() => {
        setGarden(loadGardenState());
    }, []);

    useEffect(() => {
        if (!isRunning) return;
        const timer = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    setIsRunning(false);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRunning]);

    const mm = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, '0');
    const ss = (secondsLeft % 60).toString().padStart(2, '0');

    return (
        <div data-testid="study-page" className="space-y-6">
            <div className="flex gap-2">
                <button
                    type="button"
                    data-testid="btn-tab-timer"
                    onClick={() => setTab('timer')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        tab === 'timer'
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100'
                    }`}
                >
                    <Timer className="w-4 h-4 inline mr-1" />
                    Pomodoro
                </button>
                <button
                    type="button"
                    data-testid="btn-tab-garden"
                    onClick={() => setTab('garden')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        tab === 'garden'
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100'
                    }`}
                >
                    <Flower2 className="w-4 h-4 inline mr-1" />
                    Garden
                </button>
            </div>

            {tab === 'timer' ? (
                <div className="bg-white dark:bg-stone-900 rounded-3xl border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Focus Session</h1>
                    <div
                        data-testid="pomodoro-display"
                        className="text-6xl font-black font-mono"
                    >
                        {mm}:{ss}
                    </div>
                    <div className="flex justify-center gap-2">
                        {[15, 25, 45].map((m) => (
                            <button
                                key={m}
                                type="button"
                                data-testid={`btn-duration-${m}`}
                                onClick={() => {
                                    setMinutes(m);
                                    setSecondsLeft(m * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                    minutes === m
                                        ? 'bg-[var(--theme-accent)] text-white'
                                        : 'bg-stone-100'
                                }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2">
                        <button
                            type="button"
                            data-testid="btn-pomodoro-toggle"
                            onClick={() => setIsRunning((v) => !v)}
                            className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-4 h-4 inline mr-1" />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 inline mr-1" />
                                    Start
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            data-testid="btn-pomodoro-reset"
                            onClick={() => {
                                setIsRunning(false);
                                setSecondsLeft(minutes * 60);
                            }}
                            className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4 inline mr-1" />
                            Reset
                        </button>
                    </div>
                    <p className="text-xs text-stone-400">
                        Soundscapes stay available in utils; this page uses a
                        CSS-only timer without extra packages.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl border p-6">
                        <h1 className="text-2xl font-bold">Ghibli Garden</h1>
                        <p className="text-xs text-stone-500 mt-1">
                            Dew {garden?.dewDrops ?? 0} · Coins{' '}
                            {garden?.forestCoins ?? 0} · Level{' '}
                            {garden?.forestLevel ?? 1}
                        </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {(garden?.plots || []).map((plot) => {
                            const tree = garden?.plantedTrees.find(
                                (t) => t.plotIndex === plot.index
                            );
                            const info = tree
                                ? PLANT_SPECIES_CATALOG[tree.species]
                                : null;
                            return (
                                <button
                                    key={plot.index}
                                    type="button"
                                    data-testid={`garden-plot-${plot.index}`}
                                    disabled={!plot.isUnlocked}
                                    onClick={() => {
                                        if (!garden || !tree) return;
                                        const next = {
                                            ...garden,
                                            dewDrops: Math.max(
                                                0,
                                                garden.dewDrops - 1
                                            ),
                                            plantedTrees: garden.plantedTrees.map(
                                                (t) =>
                                                    t.id === tree.id
                                                        ? {
                                                              ...t,
                                                              waterLevel: Math.min(
                                                                  100,
                                                                  t.waterLevel + 10
                                                              ),
                                                          }
                                                        : t
                                            ),
                                        };
                                        setGarden(next);
                                        saveGardenState(next);
                                    }}
                                    className={`aspect-square rounded-2xl border text-xs cursor-pointer ${
                                        plot.isUnlocked
                                            ? 'bg-emerald-50'
                                            : 'bg-stone-100 opacity-50'
                                    }`}
                                >
                                    {info ? info.symbol : plot.isUnlocked ? '+' : '🔒'}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
