import { Client, IMessage } from '@stomp/stompjs';
import { useAuthStore } from '@/store';
import {
    QuizAnswerInput,
    QuizMode,
    QuizPlayerResult,
    QuizRoomView,
} from '@/types';

export type QuizUserEvent =
    | { type: 'joined'; playerId: string }
    | { type: 'accepted' }
    | { type: 'result'; result: QuizPlayerResult }
    | { type: 'error'; message: string };

export type QuizConnectionStatus = 'connecting' | 'open' | 'closed';

export interface QuizConnection {
    start: () => void;
    next: () => void;
    end: () => void;
    setMode: (mode: QuizMode) => void;
    answer: (answer: QuizAnswerInput) => void;
    close: () => void;
}

interface ConnectOptions {
    code: string;
    role: 'host' | 'player';
    name?: string;
    onView: (view: QuizRoomView) => void;
    onEvent: (event: QuizUserEvent) => void;
    onStatus: (status: QuizConnectionStatus) => void;
}

const GUEST_KEY = 'oopsly-guest-id';

/** Players without an account keep one id per browser tab so a refresh re-attaches them. */
export function guestId(): string {
    try {
        const existing = window.sessionStorage.getItem(GUEST_KEY);
        if (existing) return existing;
        const created = crypto.randomUUID();
        window.sessionStorage.setItem(GUEST_KEY, created);
        return created;
    } catch {
        return crypto.randomUUID();
    }
}

/** SockJS also serves a plain websocket at `<endpoint>/websocket`. */
function brokerUrl() {
    const http =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9009/api/oopsly';
    return `${http.replace(/^http/, 'ws').replace(/\/$/, '')}/ws/websocket`;
}

export function connectQuiz(options: ConnectOptions): QuizConnection {
    const { code, role, name, onView, onEvent, onStatus } = options;
    const token = useAuthStore.getState().accessToken;
    const destination = (path: string) => `/app/quiz/${code}/${path}`;

    const client = new Client({
        brokerURL: brokerUrl(),
        connectHeaders: token
            ? { Authorization: `Bearer ${token}` }
            : { 'guest-id': guestId() },
        reconnectDelay: 2000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
    });

    client.onConnect = () => {
        client.subscribe(`/topic/quiz/${code}`, (message: IMessage) => {
            onView(JSON.parse(message.body) as QuizRoomView);
        });
        client.subscribe('/user/queue/quiz', (message: IMessage) => {
            onEvent(JSON.parse(message.body) as QuizUserEvent);
        });
        // Joining again with the same identity re-attaches, so one path covers reconnects.
        if (role === 'host') {
            client.publish({ destination: destination('resume') });
        } else {
            client.publish({
                destination: destination('join'),
                body: JSON.stringify({ name: name ?? '' }),
            });
        }
        onStatus('open');
    };
    client.onWebSocketClose = () => onStatus('closed');
    client.onStompError = (frame) =>
        onEvent({
            type: 'error',
            message: frame.headers.message || 'Connection refused',
        });

    onStatus('connecting');
    client.activate();

    const send = (path: string, body?: unknown) => {
        if (!client.connected) return;
        client.publish({
            destination: destination(path),
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    };

    return {
        start: () => send('start'),
        next: () => send('next'),
        end: () => send('end'),
        setMode: (mode) => send('mode', { mode }),
        answer: (answer) => send('answer', answer),
        close: () => {
            void client.deactivate();
        },
    };
}
