import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store';
import { openGameSocket, sendGardenAction } from '@/services/gameSocket';

class FakeSocket {
    static OPEN = 1;
    static instances: FakeSocket[] = [];
    readyState = 1;
    onmessage: ((m: { data: unknown }) => void) | null = null;
    onclose: ((e: { code: number }) => void) | null = null;
    send = vi.fn();
    close = vi.fn();
    constructor(public url: string) {
        FakeSocket.instances.push(this);
    }
}

const garden = {
    seedInventory: { CAMPHOR_TREE: 2 },
    plantedTrees: [{ id: 't', species: 'BAD', stage: 'SPROUT' }],
};

describe('gameSocket', () => {
    let cleanup: (() => void) | null = null;
    beforeEach(() => {
        vi.useFakeTimers();
        FakeSocket.instances = [];
        vi.stubGlobal('WebSocket', FakeSocket);
        process.env.NEXT_PUBLIC_GAME_API_URL = 'http://game.test/';
        useAuthStore.setState({ accessToken: 'tok en' } as never);
    });
    afterEach(() => {
        cleanup?.();
        cleanup = null;
        vi.useRealTimers();
        vi.unstubAllGlobals();
        delete process.env.NEXT_PUBLIC_GAME_API_URL;
    });

    it('does not connect without a token', () => {
        useAuthStore.setState({ accessToken: '' } as never);
        cleanup = openGameSocket(vi.fn());
        expect(FakeSocket.instances).toHaveLength(0);
    });

    it('connects with an encoded token and ws url', () => {
        cleanup = openGameSocket(vi.fn());
        const url = FakeSocket.instances[0].url;
        expect(url).toMatch(
            /^ws:\/\/game\.test\/v1\/game\/ws\?token=tok%20en&platform=WEB&requestId=/
        );
    });

    it('falls back to localhost when env is unset', () => {
        delete process.env.NEXT_PUBLIC_GAME_API_URL;
        cleanup = openGameSocket(vi.fn());
        expect(FakeSocket.instances[0].url).toMatch(/^ws:\/\/localhost:8000\//);
    });

    it('parses garden, reward, other and unreadable messages', () => {
        const fn = vi.fn();
        cleanup = openGameSocket(fn);
        const s = FakeSocket.instances[0];
        s.onmessage!({
            data: JSON.stringify({ type: 'garden', data: garden }),
        });
        expect(fn.mock.calls[0][0].data.seedInventory.camphor_tree).toBe(2);
        expect(fn.mock.calls[0][0].data.plantedTrees[0]).toMatchObject({
            species: 'wildflower_meadow',
            stage: 'sprout',
        });
        s.onmessage!({
            data: JSON.stringify({
                type: 'reward',
                data: { species: 'SPIRIT_LOTUS', garden },
            }),
        });
        expect(fn.mock.calls[1][0].data.species).toBe('spirit_lotus');
        s.onmessage!({ data: JSON.stringify({ type: 'ready', data: null }) });
        expect(fn.mock.calls[2][0].type).toBe('ready');
        s.onmessage!({ data: 'not json' });
        expect(fn.mock.calls[3][0]).toMatchObject({
            type: 'error',
            message: 'Garden socket sent an unreadable message',
        });
    });

    it('ignores messages after cleanup', () => {
        const fn = vi.fn();
        const stop = openGameSocket(fn);
        const s = FakeSocket.instances[0];
        stop();
        s.onmessage!({ data: '{}' });
        expect(fn).not.toHaveBeenCalled();
        expect(s.close).toHaveBeenCalled();
    });

    it('retries after close but not for code 4401', () => {
        cleanup = openGameSocket(vi.fn());
        FakeSocket.instances[0].onclose!({ code: 1006 });
        vi.advanceTimersByTime(1500);
        expect(FakeSocket.instances).toHaveLength(2);
        FakeSocket.instances[1].onclose!({ code: 4401 });
        vi.advanceTimersByTime(5000);
        expect(FakeSocket.instances).toHaveLength(2);
    });

    it('does not retry after cleanup and clears pending retry', () => {
        const stop = openGameSocket(vi.fn());
        FakeSocket.instances[0].onclose!({ code: 1006 });
        stop();
        vi.advanceTimersByTime(5000);
        expect(FakeSocket.instances).toHaveLength(1);
        const s = FakeSocket.instances[0];
        s.onclose!({ code: 1000 });
    });

    it('sendGardenAction returns false when not open and true when open', () => {
        const action = {
            action: 'water' as const,
            requestId: 'r',
            treeId: 't',
        };
        expect(sendGardenAction(action)).toBe(false);
        cleanup = openGameSocket(vi.fn());
        const s = FakeSocket.instances[0];
        s.readyState = 0;
        expect(sendGardenAction(action)).toBe(false);
        s.readyState = 1;
        expect(sendGardenAction(action)).toBe(true);
        expect(s.send).toHaveBeenCalledWith(JSON.stringify(action));
    });
});
