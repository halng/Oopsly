'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store';
import { useQuizRoom, useRemaining } from '@/hooks/useQuizRoom';
import { GameShell } from '@/components/game/GameParts';
import { PlayerMessage } from '@/components/game/PlayerScreens';
import {
    HostFinished,
    HostLobby,
    HostQuestion,
    HostReveal,
} from '@/components/game/HostScreens';

function HostGame() {
    const router = useRouter();
    const { code } = useParams<{ code: string }>();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasHydrated = useAuthStore((s) => s.hasHydrated);
    const room = useQuizRoom({
        code,
        role: 'host',
        enabled: hasHydrated && isAuthenticated,
    });
    const remainingMs = useRemaining(room.view?.deadline ?? 0, room.clockSkew);
    const { view } = room;
    const leave = () => router.push('/home');
    const end = () => {
        room.end();
        if (view?.state === 'LOBBY') leave();
    };

    const props = view && {
        view,
        remainingMs,
        onStart: room.start,
        onNext: room.next,
        onEnd: end,
        onMode: room.setMode,
    };

    let screen: React.ReactNode;
    if (!props) {
        screen = room.error ? (
            <PlayerMessage
                testId="host-error"
                title="Could not open this room"
                detail={room.error}
            />
        ) : (
            <PlayerMessage
                testId="host-connecting"
                title="Opening room…"
                busy
            />
        );
    } else if (props.view.state === 'LOBBY') {
        screen = <HostLobby {...props} />;
    } else if (props.view.state === 'QUESTION') {
        screen = <HostQuestion {...props} />;
    } else if (props.view.state === 'REVEAL') {
        screen = <HostReveal {...props} />;
    } else {
        screen = <HostFinished view={props.view} onExit={leave} />;
    }

    return (
        <GameShell testId="host-game">
            {room.status === 'closed' && view && (
                <p className="bg-amber-400 text-[#2b0d5c] text-center text-sm font-bold py-1">
                    Connection lost, reconnecting…
                </p>
            )}
            {screen}
        </GameShell>
    );
}

export default function HostGamePage() {
    return (
        <AuthGuard>
            <HostGame />
        </AuthGuard>
    );
}
