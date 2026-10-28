'use client';
import React from 'react';
import { Circle, Crown, Diamond, Square, Triangle } from 'lucide-react';
import { QuizRankView } from '@/types';

export const TILE_STYLES = [
    { bg: 'bg-red-500', ring: 'ring-red-300', Icon: Triangle },
    { bg: 'bg-blue-500', ring: 'ring-blue-300', Icon: Diamond },
    { bg: 'bg-amber-400', ring: 'ring-amber-200', Icon: Circle },
    { bg: 'bg-emerald-500', ring: 'ring-emerald-300', Icon: Square },
    { bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-300', Icon: Triangle },
    { bg: 'bg-cyan-500', ring: 'ring-cyan-300', Icon: Diamond },
];

export function GameShell({
    children,
    testId,
}: {
    children: React.ReactNode;
    testId: string;
}) {
    return (
        <main
            data-testid={testId}
            className="min-h-screen bg-gradient-to-b from-[#46178f] to-[#2b0d5c] text-white flex flex-col"
        >
            {children}
        </main>
    );
}

export function GameTopBar({
    left,
    right,
}: {
    left: React.ReactNode;
    right?: React.ReactNode;
}) {
    return (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4">
            <div className="font-black text-lg tracking-tight">{left}</div>
            <div className="flex items-center gap-3 text-sm font-bold">
                {right}
            </div>
        </header>
    );
}

export function Countdown({
    remainingMs,
    totalSeconds,
}: {
    remainingMs: number;
    totalSeconds: number;
}) {
    const seconds = Math.ceil(remainingMs / 1000);
    const fraction = totalSeconds > 0 ? remainingMs / (totalSeconds * 1000) : 0;
    return (
        <div className="flex items-center gap-3" data-testid="game-countdown">
            <div className="w-12 h-12 rounded-full bg-white text-[#46178f] flex items-center justify-center text-xl font-black">
                {seconds}
            </div>
            <div className="hidden sm:block w-40 h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                    className="h-full bg-white rounded-full transition-[width] duration-200 ease-linear"
                    style={{ width: `${Math.min(100, fraction * 100)}%` }}
                />
            </div>
        </div>
    );
}

export function AnswerTile({
    index,
    label,
    selected,
    dimmed,
    correct,
    count,
    onClick,
    disabled,
}: {
    index: number;
    label: string;
    selected?: boolean;
    dimmed?: boolean;
    correct?: boolean;
    count?: number;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const style = TILE_STYLES[index % TILE_STYLES.length];
    return (
        <button
            type="button"
            data-testid={`game-option-${index}`}
            disabled={disabled}
            onClick={onClick}
            className={`${style.bg} relative flex items-center gap-3 sm:gap-4 rounded-xl p-4 sm:p-6 min-h-[88px] text-left font-black text-lg sm:text-2xl text-white shadow-[0_6px_0_rgba(0,0,0,0.25)] transition active:translate-y-1 active:shadow-none ${
                selected ? `ring-4 ${style.ring}` : ''
            } ${dimmed ? 'opacity-30' : ''} ${disabled ? 'cursor-default' : 'cursor-pointer hover:brightness-110'}`}
        >
            <style.Icon className="w-7 h-7 shrink-0 fill-white/90" />
            <span className="flex-1 break-words">{label}</span>
            {count !== undefined && (
                <span className="rounded-lg bg-black/25 px-2 py-1 text-base">
                    {count}
                </span>
            )}
            {correct && (
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center text-lg">
                    ✓
                </span>
            )}
        </button>
    );
}

export function Leaderboard({
    rows,
    limit,
    highlightId,
}: {
    rows: QuizRankView[];
    limit?: number;
    highlightId?: string | null;
}) {
    const shown = limit ? rows.slice(0, limit) : rows;
    return (
        <ol className="space-y-2" data-testid="game-leaderboard">
            {shown.map((row) => (
                <li
                    key={row.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold ${
                        row.id === highlightId
                            ? 'bg-amber-300 text-[#2b0d5c]'
                            : 'bg-white text-[#2b0d5c]'
                    }`}
                >
                    <span className="w-8 text-center text-lg font-black">
                        {row.rank}
                    </span>
                    <span className="flex-1 truncate">{row.name}</span>
                    {row.streak >= 2 && (
                        <span className="text-xs rounded-full bg-orange-500 text-white px-2 py-0.5">
                            🔥 {row.streak}
                        </span>
                    )}
                    {row.delta > 0 && (
                        <span className="text-xs text-emerald-600">
                            +{row.delta}
                        </span>
                    )}
                    <span className="tabular-nums font-black">{row.score}</span>
                </li>
            ))}
        </ol>
    );
}

export function Podium({ rows }: { rows: QuizRankView[] }) {
    const top = rows.slice(0, 3);
    // Kahoot order: 2nd, 1st, 3rd
    const order = [top[1], top[0], top[2]];
    const heights = ['h-28', 'h-40', 'h-20'];
    const medals = ['🥈', '🥇', '🥉'];
    return (
        <div
            className="flex items-end justify-center gap-3 sm:gap-6"
            data-testid="game-podium"
        >
            {order.map((row, i) =>
                row ? (
                    <div
                        key={row.id}
                        className="flex flex-col items-center w-24 sm:w-36"
                    >
                        {i === 1 && (
                            <Crown className="w-8 h-8 text-amber-300 mb-1" />
                        )}
                        <span className="text-3xl">{medals[i]}</span>
                        <span className="font-black truncate max-w-full">
                            {row.name}
                        </span>
                        <span className="text-sm font-bold text-white/80 mb-2">
                            {row.score}
                        </span>
                        <div
                            className={`${heights[i]} w-full rounded-t-xl bg-white/90 text-[#46178f] flex items-start justify-center pt-2 text-3xl font-black`}
                        >
                            {row.rank}
                        </div>
                    </div>
                ) : (
                    <div key={`empty-${i}`} className="w-24 sm:w-36" />
                )
            )}
        </div>
    );
}
