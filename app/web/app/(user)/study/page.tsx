'use client';
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Flower2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { GardenState, PlantSpecies } from '@/types';
import { useAuthStore } from '@/store';
import { GameReward, GameService } from '@/services/gameApi';
import { openGameSocket, sendGardenAction } from '@/services/gameSocket';
import { gatherTree, openPlot, pourTree, sowSeed } from '@/game/liveGarden';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';

const GardenCanvas = dynamic(() => import('@/components/garden/GardenCanvas'), {
    ssr: false,
});
const PouchReveal = dynamic(() => import('@/components/garden/PouchReveal'), {
    ssr: false,
});

export default function StudyPage() {
    const [tab, setTab] = useState<'timer' | 'garden'>('timer');
    const [minutes, setMinutes] = useState(25);
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [garden, setGarden] = useState<GardenState | null>(null);
    const [reward, setReward] = useState<GameReward | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const armed = useRef(false);
    const claiming = useRef(false);
    const gardenRef = useRef<GardenState | null>(null);
    const beforeAction = useRef<GardenState | null>(null);
    const latestAction = useRef<string | null>(null);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        gardenRef.current = garden;
    }, [garden]);

    useEffect(() => {
        if (!isAuthenticated) return;
        void GameService.getGarden().then((res) => {
            if (res.isSuccess && res.data) setGarden(res.data);
            else setMessage(res.message);
        });
        return openGameSocket((event) => {
            if (event.requestId && event.requestId !== latestAction.current) {
                return;
            }
            latestAction.current = null;
            if (event.type === 'error') {
                if (beforeAction.current) setGarden(beforeAction.current);
                setMessage(event.message);
                return;
            }
            if (event.type === 'garden') setGarden(event.data);
            if (event.type === 'reward') {
                setReward(event.data);
                setGarden(event.data.garden);
            }
        });
    }, [isAuthenticated]);

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

    useEffect(() => {
        if (!armed.current || secondsLeft !== 0 || claiming.current) return;
        claiming.current = true;
        armed.current = false;
        void GameService.claimFocus(minutes).then((res) => {
            claiming.current = false;
            if (res.isSuccess && res.data) {
                setReward(res.data);
                setGarden(res.data.garden);
                setMessage('A seed pouch opened.');
                setTab('garden');
            } else {
                setMessage(res.message);
            }
        });
    }, [minutes, secondsLeft]);

    const play = (
        requestId: string,
        next: GardenState | null,
        note: string,
        send: () => boolean
    ): boolean => {
        const current = gardenRef.current;
        if (!current || !next) {
            setMessage('That action is not ready yet.');
            return false;
        }
        beforeAction.current = current;
        latestAction.current = requestId;
        gardenRef.current = next;
        setGarden(next);
        setMessage(note);
        if (!send()) {
            latestAction.current = null;
            gardenRef.current = current;
            setGarden(current);
            setMessage('Reconnecting to the garden...');
            return false;
        }
        return true;
    };

    const selectedTree = garden?.plantedTrees.find(
        (tree) => tree.plotIndex === selectedPlot
    );
    const selectedPlotState = garden?.plots.find(
        (plot) => plot.index === selectedPlot
    );

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
                                    armed.current = false;
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
                            onClick={() => {
                                if (!isRunning && secondsLeft > 0) {
                                    armed.current = true;
                                }
                                setIsRunning((v) => !v);
                            }}
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
                                armed.current = false;
                                setSecondsLeft(minutes * 60);
                            }}
                            className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4 inline mr-1" />
                            Reset
                        </button>
                    </div>
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
                        {message ? (
                            <p className="text-xs mt-2 text-stone-600">
                                {message}
                            </p>
                        ) : null}
                    </div>
                    {reward ? (
                        <PouchReveal
                            species={reward.species}
                            rarity={reward.rarity}
                        />
                    ) : null}
                    {garden ? (
                        <GardenCanvas
                            garden={garden}
                            onPlotSelect={setSelectedPlot}
                        />
                    ) : (
                        <p className="text-sm text-stone-500">
                            Loading garden...
                        </p>
                    )}
                    {selectedPlotState ? (
                        <div
                            data-testid="plot-panel"
                            className="bg-white dark:bg-stone-900 rounded-3xl border p-4 space-y-3"
                        >
                            <p className="text-sm font-bold">
                                Plot {selectedPlotState.index + 1}
                            </p>
                            {!selectedPlotState.isUnlocked ? (
                                <button
                                    type="button"
                                    data-testid="btn-unlock-plot"
                                    onClick={() => {
                                        const current = gardenRef.current;
                                        if (!current) return;
                                        const requestId = crypto.randomUUID();
                                        play(
                                            requestId,
                                            openPlot(
                                                current,
                                                selectedPlotState.index
                                            ),
                                            'Plot unlocked.',
                                            () =>
                                                sendGardenAction({
                                                    action: 'unlock',
                                                    requestId,
                                                    plotIndex:
                                                        selectedPlotState.index,
                                                })
                                        );
                                    }}
                                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                                >
                                    Unlock for {selectedPlotState.unlockCost}{' '}
                                    coins
                                </button>
                            ) : null}
                            {selectedPlotState.isUnlocked && !selectedTree ? (
                                <div className="flex flex-wrap gap-2">
                                    {(
                                        Object.entries(
                                            garden?.seedInventory || {}
                                        ) as [PlantSpecies, number][]
                                    )
                                        .filter(([, count]) => count > 0)
                                        .map(([species, count]) => (
                                            <button
                                                key={species}
                                                type="button"
                                                data-testid={`btn-plant-${species}`}
                                                onClick={() => {
                                                    const current =
                                                        gardenRef.current;
                                                    if (!current) return;
                                                    const requestId =
                                                        crypto.randomUUID();
                                                    play(
                                                        requestId,
                                                        sowSeed(
                                                            current,
                                                            species,
                                                            selectedPlotState.index,
                                                            requestId
                                                        ),
                                                        'Seed planted.',
                                                        () =>
                                                            sendGardenAction({
                                                                action: 'plant',
                                                                requestId,
                                                                species,
                                                                plotIndex:
                                                                    selectedPlotState.index,
                                                            })
                                                    );
                                                }}
                                                className="px-3 py-2 rounded-xl bg-emerald-50 text-xs font-bold cursor-pointer"
                                            >
                                                {
                                                    PLANT_SPECIES_CATALOG[
                                                        species
                                                    ].symbol
                                                }{' '}
                                                {
                                                    PLANT_SPECIES_CATALOG[
                                                        species
                                                    ].name
                                                }{' '}
                                                ({count})
                                            </button>
                                        ))}
                                </div>
                            ) : null}
                            {selectedTree ? (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        data-testid="btn-water-tree"
                                        onClick={() => {
                                            const current = gardenRef.current;
                                            if (!current) return;
                                            const requestId =
                                                crypto.randomUUID();
                                            play(
                                                requestId,
                                                pourTree(
                                                    current,
                                                    selectedTree.id
                                                ),
                                                'Pouring.',
                                                () =>
                                                    sendGardenAction({
                                                        action: 'water',
                                                        requestId,
                                                        treeId: selectedTree.id,
                                                    })
                                            );
                                        }}
                                        className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Water (5 dew)
                                    </button>
                                    {selectedTree.stage === 'blooming' ||
                                    selectedTree.stage === 'ancient' ? (
                                        <button
                                            type="button"
                                            data-testid="btn-harvest-tree"
                                            onClick={() => {
                                                const current =
                                                    gardenRef.current;
                                                if (!current) return;
                                                const requestId =
                                                    crypto.randomUUID();
                                                const gathered = gatherTree(
                                                    current,
                                                    selectedTree.id
                                                );
                                                if (!gathered) {
                                                    setMessage(
                                                        'This plant is not ready to harvest.'
                                                    );
                                                    return;
                                                }
                                                const sent = play(
                                                    requestId,
                                                    gathered.garden,
                                                    'Harvest gathered.',
                                                    () =>
                                                        sendGardenAction({
                                                            action: 'harvest',
                                                            requestId,
                                                            treeId: selectedTree.id,
                                                        })
                                                );
                                                if (sent)
                                                    setReward(gathered.reward);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer"
                                        >
                                            Harvest
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
