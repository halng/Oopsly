'use client';
import React, { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuizRoom, useRemaining } from '@/hooks/useQuizRoom';
import { GameShell } from '@/components/game/GameParts';
import {
    PlayerFinished,
    PlayerMessage,
    PlayerNameForm,
    PlayerQuestion,
    PlayerReveal,
} from '@/components/game/PlayerScreens';

function PlayerGame() {
    const router = useRouter();
    const { code } = useParams<{ code: string }>();
    const initialName = useSearchParams().get('name')?.trim() ?? '';
    const [name, setName] = useState(initialName);

    const room = useQuizRoom({
        code,
        role: 'player',
        name,
        enabled: name !== '',
    });
    const remainingMs = useRemaining(room.view?.deadline ?? 0, room.clockSkew);
    const exit = () => router.push('/');
    const { view } = room;

    let screen: React.ReactNode;
    if (!name || (!view && room.error)) {
        screen = (
            <PlayerNameForm
                code={code}
                error={room.error}
                onSubmit={(value) => setName(value)}
            />
        );
    } else if (!view) {
        screen = (
            <PlayerMessage
                testId="player-connecting"
                title={room.status === 'closed' ? 'Reconnecting…' : 'Joining…'}
                busy
            />
        );
    } else if (view.state === 'LOBBY') {
        screen = (
            <PlayerMessage
                testId="player-lobby"
                title="You're in!"
                detail={`${name} · waiting for ${view.hostName} to start`}
                busy
            />
        );
    } else if (view.state === 'QUESTION') {
        screen = (
            <PlayerQuestion
                view={view}
                remainingMs={remainingMs}
                hasAnswered={room.hasAnswered}
                error={room.error}
                onAnswer={room.answer}
            />
        );
    } else if (view.state === 'REVEAL') {
        screen = <PlayerReveal view={view} result={room.result} />;
    } else {
        screen = (
            <PlayerFinished
                view={view}
                playerId={room.playerId}
                result={room.result}
                onExit={exit}
            />
        );
    }

    return (
        <GameShell testId="player-game">
            {room.status === 'closed' && view && (
                <p className="bg-amber-400 text-[#2b0d5c] text-center text-sm font-bold py-1">
                    Connection lost, reconnecting…
                </p>
            )}
            {screen}
        </GameShell>
    );
}

export default function PlayerGamePage() {
    return (
        <Suspense fallback={null}>
            <PlayerGame />
        </Suspense>
    );
}
