import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store';
import { connectQuiz, guestId } from '@/services/quizSocket';

const { clients, FakeClient } = vi.hoisted(() => {
    const clients: unknown[] = [];
    class FakeClient {
        connected = true;
        onConnect: () => void = () => {};
        onWebSocketClose: () => void = () => {};
        onStompError: (frame: { headers: Record<string, string> }) => void =
            () => {};
        subscriptions: Record<string, (m: { body: string }) => void> = {};
        published: { destination: string; body?: string }[] = [];
        activate = vi.fn();
        deactivate = vi.fn().mockResolvedValue(undefined);
        connectHeaders: Record<string, string> = {};
        beforeConnect: () => Promise<void> = async () => {};
        constructor(public config: Record<string, unknown>) {
            clients.push(this);
        }
        subscribe(destination: string, cb: (m: { body: string }) => void) {
            this.subscriptions[destination] = cb;
        }
        publish(message: { destination: string; body?: string }) {
            this.published.push(message);
        }
    }

    return { clients, FakeClient };
});

vi.mock('@stomp/stompjs', () => ({ Client: FakeClient }));

function setup(role: 'host' | 'player') {
    const onView = vi.fn();
    const onEvent = vi.fn();
    const onStatus = vi.fn();
    const conn = connectQuiz({
        code: '123456',
        role,
        name: 'Ana',
        onView,
        onEvent,
        onStatus,
    });
    return {
        conn,
        client: clients[clients.length - 1],
        onView,
        onEvent,
        onStatus,
    };
}

describe('quizSocket', () => {
    beforeEach(() => {
        clients.length = 0;
        window.sessionStorage.clear();
        useAuthStore.setState({ accessToken: '' } as never);
        delete process.env.NEXT_PUBLIC_API_URL;
    });

    it('keeps one guest id per tab', () => {
        const first = guestId();
        expect(guestId()).toBe(first);
        expect(first).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('connects as a guest to the plain websocket endpoint and joins on connect', async () => {
        process.env.NEXT_PUBLIC_API_URL = 'https://api.test/api/oopsly/';
        const { client, onView, onEvent, onStatus } = setup('player');

        expect(client.config.brokerURL).toBe(
            'wss://api.test/api/oopsly/ws/websocket'
        );
        await client.beforeConnect();
        expect(client.connectHeaders).toEqual({ 'guest-id': guestId() });
        expect(onStatus).toHaveBeenCalledWith('connecting');
        expect(client.activate).toHaveBeenCalled();

        client.onConnect();
        expect(onStatus).toHaveBeenCalledWith('open');
        expect(client.published[0]).toEqual({
            destination: '/app/quiz/123456/join',
            body: JSON.stringify({ name: 'Ana' }),
        });

        client.subscriptions['/topic/quiz/123456']({
            body: '{"code":"123456"}',
        });
        client.subscriptions['/user/queue/quiz']({
            body: '{"type":"accepted"}',
        });
        expect(onView).toHaveBeenCalledWith({ code: '123456' });
        expect(onEvent).toHaveBeenCalledWith({ type: 'accepted' });
    });

    it('authenticates with the access token and resumes as host', async () => {
        useAuthStore.setState({ accessToken: 'jwt' } as never);
        const { client, onStatus } = setup('host');

        await client.beforeConnect();
        expect(client.connectHeaders).toEqual({
            Authorization: 'Bearer jwt',
        });
        client.onConnect();
        expect(client.published[0]).toEqual({
            destination: '/app/quiz/123456/resume',
        });
        expect(client.config.brokerURL).toBe(
            'ws://localhost:9009/api/oopsly/ws/websocket'
        );

        client.onWebSocketClose();
        expect(onStatus).toHaveBeenCalledWith('closed');
    });

    it('sends commands only while connected and surfaces stomp errors', () => {
        const { conn, client, onEvent } = setup('host');
        client.onConnect();
        client.published.length = 0;

        conn.start();
        conn.next();
        conn.end();
        conn.setMode('AUTO');
        conn.answer({ index: 1 });
        expect(client.published.map((p) => p.destination)).toEqual([
            '/app/quiz/123456/start',
            '/app/quiz/123456/next',
            '/app/quiz/123456/end',
            '/app/quiz/123456/mode',
            '/app/quiz/123456/answer',
        ]);
        expect(client.published[3].body).toBe('{"mode":"AUTO"}');

        client.connected = false;
        client.published.length = 0;
        conn.start();
        expect(client.published).toHaveLength(0);

        client.onStompError({ headers: { message: 'denied' } });
        client.onStompError({ headers: {} });
        expect(onEvent).toHaveBeenCalledWith({
            type: 'error',
            message: 'denied',
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: 'error',
            message: 'Connection refused',
        });

        conn.close();
        expect(client.deactivate).toHaveBeenCalled();
    });
});
