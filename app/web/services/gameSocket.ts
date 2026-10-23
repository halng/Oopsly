import { ulid } from 'ulid';
import { useAuthStore } from '@/store';
import { GardenState } from '@/types';
import {
    GameReward,
    normalizeGarden,
    normalizeReward,
} from '@/services/gameApi';

export type GardenAction =
    | { action: 'water'; requestId: string; treeId: string }
    | { action: 'harvest'; requestId: string; treeId: string }
    | {
          action: 'plant';
          requestId: string;
          species: string;
          plotIndex: number;
      }
    | { action: 'unlock'; requestId: string; plotIndex: number };

export type GardenSocketEvent =
    | {
          type: 'ready' | 'error';
          requestId: string | null;
          message: string;
          data: null;
      }
    | {
          type: 'garden';
          requestId: string | null;
          message: string;
          data: GardenState;
      }
    | {
          type: 'reward';
          requestId: string | null;
          message: string;
          data: GameReward;
      };

type Listener = (event: GardenSocketEvent) => void;

let socket: WebSocket | null = null;
let listener: Listener | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function socketUrl(token: string) {
    const http =
        process.env.NEXT_PUBLIC_GAME_API_URL || 'http://localhost:8000';
    const base = http.replace(/^http/, 'ws').replace(/\/$/, '');
    const requestId = ulid();
    return `${base}/v1/game/ws?token=${encodeURIComponent(token)}&platform=WEB&requestId=${requestId}`;
}

function parseEvent(raw: string): GardenSocketEvent | null {
    const body = JSON.parse(raw) as GardenSocketEvent;
    if (body.type === 'garden' && body.data) {
        return { ...body, data: normalizeGarden(body.data) };
    }
    if (body.type === 'reward' && body.data) {
        return { ...body, data: normalizeReward(body.data) };
    }
    return body;
}

function connect() {
    const token = useAuthStore.getState().accessToken;
    if (!token || !listener) return;
    socket = new WebSocket(socketUrl(token));
    socket.onmessage = (message) => {
        if (!listener) return;
        try {
            const event = parseEvent(String(message.data));
            if (event) listener(event);
        } catch {
            listener({
                type: 'error',
                requestId: null,
                message: 'Garden socket sent an unreadable message',
                data: null,
            });
        }
    };
    socket.onclose = (event) => {
        socket = null;
        if (!listener || event.code === 4401) return;
        retryTimer = setTimeout(connect, 1500);
    };
}

export function openGameSocket(onEvent: Listener) {
    listener = onEvent;
    connect();
    return () => {
        listener = null;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        socket?.close();
        socket = null;
    };
}

export function sendGardenAction(action: GardenAction): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(action));
    return true;
}
