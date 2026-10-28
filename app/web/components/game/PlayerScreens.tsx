'use client';
import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { QuizAnswerInput, QuizPlayerResult, QuizRoomView } from '@/types';
import {
    AnswerTile,
    Countdown,
    GameTopBar,
    Leaderboard,
    Podium,
} from './GameParts';

export function PlayerNameForm({
    code,
    error,
    onSubmit,
}: {
    code: string;
    error: string | null;
    onSubmit: (name: string) => void;
}) {
    const [name, setName] = useState('');
    return (
        <div
            className="flex-1 flex items-center justify-center p-4"
            data-testid="player-name-form"
        >
            <form
                className="w-full max-w-sm rounded-3xl bg-white text-[#2b0d5c] p-6 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (name.trim()) onSubmit(name.trim());
                }}
            >
                <p className="text-center text-sm font-bold text-stone-500">
                    Game PIN
                </p>
                <p className="text-center text-4xl font-black tracking-[0.2em]">
                    {code}
                </p>
                <input
                    data-testid="player-name-input"
                    value={name}
                    maxLength={20}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nickname"
                    className="w-full rounded-xl border-2 border-stone-200 p-3 text-center text-lg font-black focus:outline-none focus:border-[#46178f]"
                />
                {error && (
                    <p
                        className="text-center text-sm font-bold text-red-600"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                <button
                    type="submit"
                    data-testid="player-name-submit"
                    disabled={!name.trim()}
                    className="w-full rounded-xl bg-[#46178f] text-white py-3 font-black disabled:opacity-40 cursor-pointer"
                >
                    OK, go!
                </button>
            </form>
        </div>
    );
}

export function PlayerMessage({
    title,
    detail,
    testId,
    busy,
}: {
    title: string;
    detail?: string;
    testId: string;
    busy?: boolean;
}) {
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center"
            data-testid={testId}
        >
            {busy && <Loader2 className="w-10 h-10 animate-spin" />}
            <p className="text-3xl font-black">{title}</p>
            {detail && <p className="text-white/80 font-bold">{detail}</p>}
        </div>
    );
}

export function PlayerQuestion({
    view,
    remainingMs,
    hasAnswered,
    error,
    onAnswer,
}: {
    view: QuizRoomView;
    remainingMs: number;
    hasAnswered: boolean;
    error: string | null;
    onAnswer: (answer: QuizAnswerInput) => void;
}) {
    const question = view.question;
    const [picked, setPicked] = useState<number[]>([]);
    const [text, setText] = useState('');
    if (!question) return null;

    if (hasAnswered) {
        return (
            <PlayerMessage
                testId="player-waiting"
                title="Answer locked in"
                detail="Waiting for the others…"
                busy
            />
        );
    }

    const isMulti = question.type === 'MULTIPLE_CHOICE';
    const isBlank = question.type === 'FILL_IN_THE_BLANK';

    return (
        <div className="flex-1 flex flex-col" data-testid="player-question">
            <GameTopBar
                left={`${view.questionIndex + 1} / ${view.totalQuestions}`}
                right={
                    <Countdown
                        remainingMs={remainingMs}
                        totalSeconds={view.questionSeconds}
                    />
                }
            />
            <section className="flex-1 flex flex-col gap-4 px-4 pb-6 max-w-3xl w-full mx-auto">
                <h1 className="rounded-2xl bg-white text-[#2b0d5c] text-xl font-black text-center p-4">
                    {question.text}
                </h1>
                {error && (
                    <p
                        className="text-center font-bold text-amber-300"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                {isBlank ? (
                    <form
                        className="flex-1 flex flex-col justify-center gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (text.trim()) onAnswer({ text });
                        }}
                    >
                        <input
                            data-testid="player-text-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your answer"
                            className="rounded-xl p-4 text-xl font-black text-[#2b0d5c] text-center focus:outline-none"
                        />
                        <button
                            type="submit"
                            data-testid="player-submit"
                            disabled={!text.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#46178f] py-4 font-black disabled:opacity-40 cursor-pointer"
                        >
                            <Send className="w-5 h-5" />
                            Submit
                        </button>
                    </form>
                ) : (
                    <>
                        <div className="flex-1 grid sm:grid-cols-2 gap-3 content-center">
                            {question.options.map((option, i) => (
                                <AnswerTile
                                    key={i}
                                    index={i}
                                    label={option}
                                    selected={picked.includes(i)}
                                    onClick={() =>
                                        isMulti
                                            ? setPicked((p) =>
                                                  p.includes(i)
                                                      ? p.filter((x) => x !== i)
                                                      : [...p, i]
                                              )
                                            : onAnswer({ index: i })
                                    }
                                />
                            ))}
                        </div>
                        {isMulti && (
                            <button
                                type="button"
                                data-testid="player-submit"
                                disabled={picked.length === 0}
                                onClick={() => onAnswer({ indexes: picked })}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#46178f] py-4 font-black disabled:opacity-40 cursor-pointer"
                            >
                                <Send className="w-5 h-5" />
                                Submit
                            </button>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

export function PlayerReveal({
    view,
    result,
}: {
    view: QuizRoomView;
    result: QuizPlayerResult | null;
}) {
    if (!result) {
        return (
            <PlayerMessage
                testId="player-reveal-pending"
                title="Results coming up…"
                busy
            />
        );
    }
    const tone = !result.answered
        ? 'bg-stone-600'
        : result.correct
          ? 'bg-emerald-500'
          : 'bg-red-500';
    const headline = !result.answered
        ? "Time's up"
        : result.correct
          ? 'Correct!'
          : 'Incorrect';
    return (
        <div
            className={`flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center ${tone}`}
            data-testid="player-reveal"
        >
            <p
                className="text-4xl font-black"
                data-testid="player-reveal-headline"
            >
                {headline}
            </p>
            {result.correct && (
                <p className="text-2xl font-black">+{result.points}</p>
            )}
            {result.streak >= 2 && (
                <p className="rounded-full bg-orange-500 px-4 py-1 font-black">
                    🔥 {result.streak} in a row
                </p>
            )}
            {!result.correct && view.reveal && view.reveal.correctText && (
                <p className="font-bold">Answer: {view.reveal.correctText}</p>
            )}
            <div className="rounded-2xl bg-black/25 px-6 py-3 font-bold">
                <p>Rank #{result.rank}</p>
                <p className="text-sm text-white/80">{result.score} points</p>
            </div>
        </div>
    );
}

export function PlayerFinished({
    view,
    playerId,
    result,
    onExit,
}: {
    view: QuizRoomView;
    playerId: string | null;
    result: QuizPlayerResult | null;
    onExit: () => void;
}) {
    return (
        <div
            className="flex-1 flex flex-col gap-6 p-4 max-w-2xl w-full mx-auto"
            data-testid="player-finished"
        >
            <p className="text-center text-3xl font-black pt-4">
                {result ? `You finished #${result.rank}` : 'Game over'}
            </p>
            <Podium rows={view.leaderboard} />
            <Leaderboard
                rows={view.leaderboard}
                limit={10}
                highlightId={playerId}
            />
            <button
                type="button"
                data-testid="player-exit"
                onClick={onExit}
                className="self-center rounded-xl bg-white text-[#46178f] px-8 py-3 font-black cursor-pointer"
            >
                Leave
            </button>
        </div>
    );
}
