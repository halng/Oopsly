import { useCallback, useEffect, useRef, useState } from 'react';
import {
    QuizAnswerInput,
    QuizMode,
    QuizPlayerResult,
    QuizRoomView,
} from '@/types';
import {
    connectQuiz,
    QuizConnection,
    QuizConnectionStatus,
    QuizUserEvent,
} from '@/services/quizSocket';

interface Options {
    code: string;
    role: 'host' | 'player';
    name?: string;
    enabled?: boolean;
}

interface TaggedResult extends QuizPlayerResult {
    questionIndex: number;
}

/** Keeps one live room in sync and exposes the host and player commands. */
export function useQuizRoom({ code, role, name, enabled = true }: Options) {
    const [view, setView] = useState<QuizRoomView | null>(null);
    const [status, setStatus] = useState<QuizConnectionStatus>('connecting');
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [result, setResult] = useState<TaggedResult | null>(null);
    const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clockSkew, setClockSkew] = useState(0);
    const connection = useRef<QuizConnection | null>(null);
    const indexRef = useRef(-1);

    useEffect(() => {
        if (!enabled || !code) return;
        const onEvent = (event: QuizUserEvent) => {
            if (event.type === 'joined') {
                setPlayerId(event.playerId);
                setError(null);
            } else if (event.type === 'result') {
                setResult({ ...event.result, questionIndex: indexRef.current });
            } else if (event.type === 'error') {
                setError(event.message);
                setAnsweredIndex(null);
            }
        };
        const conn = connectQuiz({
            code,
            role,
            name,
            onView: (next) => {
                indexRef.current = next.questionIndex;
                setClockSkew(next.serverTime - Date.now());
                setView(next);
            },
            onEvent,
            onStatus: setStatus,
        });
        connection.current = conn;
        return () => {
            conn.close();
            connection.current = null;
        };
    }, [code, role, name, enabled]);

    const answer = useCallback((input: QuizAnswerInput) => {
        setAnsweredIndex(indexRef.current);
        setError(null);
        connection.current?.answer(input);
    }, []);

    return {
        view,
        status,
        playerId,
        error,
        clockSkew,
        hasAnswered: view !== null && answeredIndex === view.questionIndex,
        result:
            view !== null && result?.questionIndex === view.questionIndex
                ? result
                : null,
        start: () => connection.current?.start(),
        next: () => connection.current?.next(),
        end: () => connection.current?.end(),
        setMode: (mode: QuizMode) => connection.current?.setMode(mode),
        answer,
    };
}

/** Milliseconds left until a server deadline, ticking every 200ms. */
export function useRemaining(deadline: number, clockSkew: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (deadline <= 0) return;
        const timer = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(timer);
    }, [deadline]);
    return deadline > 0 ? Math.max(0, deadline - (now + clockSkew)) : 0;
}
