'use client';
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, FastForward, Play, Square, Users, Check } from 'lucide-react';
import { QuizMode, QuizRoomView } from '@/types';
import {
    AnswerTile,
    Countdown,
    GameTopBar,
    Leaderboard,
    Podium,
} from './GameParts';

interface HostProps {
    view: QuizRoomView;
    remainingMs: number;
    onStart: () => void;
    onNext: () => void;
    onEnd: () => void;
    onMode: (mode: QuizMode) => void;
}

function ModeToggle({
    mode,
    onMode,
}: {
    mode: QuizMode;
    onMode: (mode: QuizMode) => void;
}) {
    return (
        <div
            className="inline-flex rounded-xl bg-black/25 p-1 text-sm font-bold"
            data-testid="host-mode-toggle"
        >
            {(['MANUAL', 'AUTO'] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    data-testid={`host-mode-${value.toLowerCase()}`}
                    onClick={() => onMode(value)}
                    className={`px-4 py-2 rounded-lg cursor-pointer ${
                        mode === value
                            ? 'bg-white text-[#46178f]'
                            : 'text-white/80'
                    }`}
                >
                    {value === 'MANUAL' ? 'Manual next' : 'Auto advance'}
                </button>
            ))}
        </div>
    );
}

export function HostLobby({ view, onStart, onMode, onEnd }: HostProps) {
    const [copied, setCopied] = useState(false);
    const joinUrl =
        typeof window === 'undefined'
            ? ''
            : `${window.location.origin}/game/${view.code}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard can be blocked; the link stays visible on screen.
        }
    };

    return (
        <div className="flex-1 flex flex-col" data-testid="host-lobby">
            <GameTopBar
                left={view.title}
                right={
                    <span className="inline-flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span data-testid="host-player-count">
                            {view.playerCount} / {view.maxPlayers}
                        </span>
                    </span>
                }
            />
            <section className="mx-auto w-full max-w-4xl px-4 flex flex-col items-center gap-6 pb-8">
                <div className="w-full rounded-3xl bg-white text-[#2b0d5c] p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-bold text-stone-500">
                            Join at{' '}
                            <span className="underline">
                                {joinUrl.replace(/^https?:\/\//, '')}
                            </span>{' '}
                            or enter the game PIN
                        </p>
                        <p
                            data-testid="host-room-code"
                            className="text-6xl sm:text-8xl font-black tracking-[0.15em] mt-2"
                        >
                            {view.code}
                        </p>
                        <button
                            type="button"
                            onClick={copy}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#46178f] cursor-pointer"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            {copied ? 'Copied' : 'Copy join link'}
                        </button>
                    </div>
                    <div
                        className="mx-auto rounded-2xl bg-white p-3 border-4 border-[#46178f]"
                        data-testid="host-qr"
                    >
                        {joinUrl && <QRCodeSVG value={joinUrl} size={168} />}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <ModeToggle mode={view.mode} onMode={onMode} />
                    <span className="text-sm font-bold text-white/80">
                        {view.totalQuestions} questions · {view.questionSeconds}
                        s each
                    </span>
                </div>

                <ul
                    className="flex flex-wrap justify-center gap-2 min-h-[56px]"
                    data-testid="host-player-list"
                >
                    {view.players.length === 0 && (
                        <li className="text-white/70 font-bold animate-pulse">
                            Waiting for players to join…
                        </li>
                    )}
                    {view.players.map((player) => (
                        <li
                            key={player.id}
                            className={`rounded-full bg-white/15 px-4 py-2 font-bold ${
                                player.connected ? '' : 'opacity-40'
                            }`}
                        >
                            {player.name}
                        </li>
                    ))}
                </ul>

                <div className="flex gap-3">
                    <button
                        type="button"
                        data-testid="host-start"
                        disabled={view.playerCount === 0}
                        onClick={onStart}
                        className="inline-flex items-center gap-2 rounded-xl bg-white text-[#46178f] px-8 py-4 text-xl font-black shadow-[0_6px_0_rgba(0,0,0,0.25)] disabled:opacity-40 cursor-pointer"
                    >
                        <Play className="w-6 h-6 fill-current" />
                        Start
                    </button>
                    <button
                        type="button"
                        data-testid="host-cancel"
                        onClick={onEnd}
                        className="rounded-xl bg-white/15 px-5 py-4 font-bold cursor-pointer"
                    >
                        Close room
                    </button>
                </div>
            </section>
        </div>
    );
}

export function HostQuestion({
    view,
    remainingMs,
    onNext,
    onEnd,
    onMode,
}: HostProps) {
    const question = view.question;
    if (!question) return null;
    return (
        <div className="flex-1 flex flex-col" data-testid="host-question">
            <GameTopBar
                left={`${view.questionIndex + 1} / ${view.totalQuestions}`}
                right={
                    <>
                        <span data-testid="host-answered-count">
                            {view.answeredCount} / {view.playerCount} answered
                        </span>
                        <Countdown
                            remainingMs={remainingMs}
                            totalSeconds={view.questionSeconds}
                        />
                    </>
                }
            />
            <section className="mx-auto w-full max-w-5xl px-4 flex-1 flex flex-col gap-6 pb-8">
                <h1 className="rounded-2xl bg-white text-[#2b0d5c] text-2xl sm:text-4xl font-black text-center p-6 sm:p-10">
                    {question.text}
                </h1>
                {question.options.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                        {question.options.map((option, i) => (
                            <AnswerTile
                                key={i}
                                index={i}
                                label={option}
                                disabled
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/80 font-bold text-lg">
                        Players are typing their answers…
                    </p>
                )}
                <HostControls
                    view={view}
                    nextLabel="Skip"
                    onNext={onNext}
                    onEnd={onEnd}
                    onMode={onMode}
                />
            </section>
        </div>
    );
}

function HostControls({
    view,
    nextLabel,
    onNext,
    onEnd,
    onMode,
}: {
    view: QuizRoomView;
    nextLabel: string;
    onNext: () => void;
    onEnd: () => void;
    onMode: (mode: QuizMode) => void;
}) {
    return (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <ModeToggle mode={view.mode} onMode={onMode} />
            <div className="flex gap-3">
                <button
                    type="button"
                    data-testid="host-end"
                    onClick={onEnd}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/90 px-5 py-3 font-black cursor-pointer"
                >
                    <Square className="w-4 h-4 fill-current" />
                    Stop game
                </button>
                <button
                    type="button"
                    data-testid="host-next"
                    onClick={onNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-[#46178f] px-6 py-3 font-black shadow-[0_4px_0_rgba(0,0,0,0.25)] cursor-pointer"
                >
                    <FastForward className="w-5 h-5 fill-current" />
                    {nextLabel}
                </button>
            </div>
        </div>
    );
}

export function HostReveal({
    view,
    remainingMs,
    onNext,
    onEnd,
    onMode,
}: HostProps) {
    const question = view.question;
    const reveal = view.reveal;
    if (!question || !reveal) return null;
    const last = view.questionIndex + 1 >= view.totalQuestions;
    const max = Math.max(1, ...reveal.distribution);
    const accuracy =
        reveal.answeredCount === 0
            ? 0
            : Math.round((reveal.correctCount / reveal.answeredCount) * 100);

    return (
        <div className="flex-1 flex flex-col" data-testid="host-reveal">
            <GameTopBar
                left={`${view.questionIndex + 1} / ${view.totalQuestions}`}
                right={
                    view.mode === 'AUTO' && remainingMs > 0 ? (
                        <span data-testid="host-auto-next">
                            Next in {Math.ceil(remainingMs / 1000)}s
                        </span>
                    ) : undefined
                }
            />
            <section className="mx-auto w-full max-w-5xl px-4 flex-1 flex flex-col gap-6 pb-8">
                <h1 className="rounded-2xl bg-white text-[#2b0d5c] text-xl sm:text-3xl font-black text-center p-5">
                    {question.text}
                </h1>

                <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
                    <div className="space-y-4">
                        {question.options.length > 0 ? (
                            <div
                                className="grid sm:grid-cols-2 gap-3"
                                data-testid="host-distribution"
                            >
                                {question.options.map((option, i) => (
                                    <div key={i} className="space-y-1">
                                        <AnswerTile
                                            index={i}
                                            label={option}
                                            disabled
                                            count={reveal.distribution[i] ?? 0}
                                            correct={reveal.correctIndexes.includes(
                                                i
                                            )}
                                            dimmed={
                                                !reveal.correctIndexes.includes(
                                                    i
                                                )
                                            }
                                        />
                                        <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                                            <div
                                                className="h-full bg-white"
                                                style={{
                                                    width: `${((reveal.distribution[i] ?? 0) / max) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl bg-white text-[#2b0d5c] p-4 text-xl font-black text-center">
                                Accepted: {reveal.correctText}
                            </p>
                        )}
                        {reveal.explanation && (
                            <p className="rounded-xl bg-white/10 p-4 font-semibold">
                                💡 {reveal.explanation}
                            </p>
                        )}
                        <dl
                            className="grid grid-cols-3 gap-3 text-center"
                            data-testid="host-stats"
                        >
                            <div className="rounded-xl bg-white/10 p-3">
                                <dt className="text-xs font-bold text-white/70">
                                    Correct
                                </dt>
                                <dd className="text-2xl font-black">
                                    {accuracy}%
                                </dd>
                            </div>
                            <div className="rounded-xl bg-white/10 p-3">
                                <dt className="text-xs font-bold text-white/70">
                                    Answered
                                </dt>
                                <dd className="text-2xl font-black">
                                    {reveal.answeredCount}/{view.playerCount}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-white/10 p-3">
                                <dt className="text-xs font-bold text-white/70">
                                    Avg time
                                </dt>
                                <dd className="text-2xl font-black">
                                    {reveal.averageSeconds}s
                                </dd>
                            </div>
                        </dl>
                    </div>
                    <div>
                        <h2 className="mb-3 font-black text-lg">Leaderboard</h2>
                        <Leaderboard rows={view.leaderboard} />
                    </div>
                </div>

                <HostControls
                    view={view}
                    nextLabel={last ? 'Final results' : 'Next question'}
                    onNext={onNext}
                    onEnd={onEnd}
                    onMode={onMode}
                />
            </section>
        </div>
    );
}

export function HostFinished({
    view,
    onExit,
}: {
    view: QuizRoomView;
    onExit: () => void;
}) {
    return (
        <div className="flex-1 flex flex-col" data-testid="host-finished">
            <GameTopBar left={view.title} right={<span>Game over</span>} />
            <section className="mx-auto w-full max-w-4xl px-4 flex flex-col gap-8 pb-10">
                <Podium rows={view.leaderboard} />
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="mb-3 font-black text-lg">
                            Final standings
                        </h2>
                        <Leaderboard rows={view.leaderboard} />
                    </div>
                    <div>
                        <h2 className="mb-3 font-black text-lg">
                            Question report
                        </h2>
                        <ul className="space-y-2" data-testid="host-summary">
                            {view.summary.map((item, i) => {
                                const pct =
                                    item.answered === 0
                                        ? 0
                                        : Math.round(
                                              (item.correct / item.answered) *
                                                  100
                                          );
                                return (
                                    <li
                                        key={i}
                                        className="rounded-xl bg-white/10 p-3"
                                    >
                                        <div className="flex justify-between gap-3 text-sm font-bold">
                                            <span className="truncate">
                                                {i + 1}. {item.text}
                                            </span>
                                            <span>{pct}%</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-400"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid="host-exit"
                    onClick={onExit}
                    className="self-center rounded-xl bg-white text-[#46178f] px-8 py-3 font-black cursor-pointer"
                >
                    Back to Oopsly
                </button>
            </section>
        </div>
    );
}
