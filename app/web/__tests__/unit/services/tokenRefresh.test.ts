import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore, useUserProfileStore } from '@/store';
import {
    expireSession,
    freshAccessToken,
    installTokenRefresh,
    isExpiring,
    refreshSession,
    startTokenRefreshTimer,
    tokenExpiry,
} from '@/services/tokenRefresh';

function jwt(expSecondsFromNow: number) {
    const body = btoa(
        JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
        })
    )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `h.${body}.s`;
}

function signIn(accessToken: string) {
    useAuthStore.setState({
        isAuthenticated: true,
        userEmail: 'a@b.co',
        accessToken,
        refreshToken: 'refresh-1',
        sessionExpired: false,
    } as never);
}

const refreshed = (access: string, refresh = 'refresh-1') => ({
    data: { data: { access_token: access, refresh_token: refresh } },
});

describe('tokenRefresh', () => {
    let post: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        post = vi.spyOn(axios, 'post');
        delete process.env.NEXT_PUBLIC_AUTH_URL;
        useAuthStore.getState().clearAuth();
        useAuthStore.setState({ sessionExpired: false } as never);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('reads exp and decides when a token is expiring', () => {
        expect(tokenExpiry(jwt(600))).toBeGreaterThan(Date.now() / 1000);
        expect(tokenExpiry('garbage')).toBeNull();
        expect(tokenExpiry('a.e30.c')).toBeNull(); // no exp claim
        expect(isExpiring(jwt(600))).toBe(false);
        expect(isExpiring(jwt(10))).toBe(true);
        expect(isExpiring(jwt(-5))).toBe(true);
        expect(isExpiring('garbage')).toBe(false);
    });

    it('swaps the refresh token for a new access token', async () => {
        process.env.NEXT_PUBLIC_AUTH_URL = 'http://auth.test/api/auth/';
        signIn(jwt(-1));
        const next = jwt(3600);
        post.mockResolvedValue(refreshed(next));

        await expect(refreshSession()).resolves.toBe(true);

        expect(post).toHaveBeenCalledWith(
            'http://auth.test/api/auth/v1/users/refresh-token',
            { refresh_token: 'refresh-1', user_email: 'a@b.co' },
            expect.any(Object)
        );
        expect(useAuthStore.getState().accessToken).toBe(next);
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('shares one request between concurrent callers', async () => {
        signIn(jwt(-1));
        post.mockResolvedValue(refreshed(jwt(3600)));
        const results = await Promise.all([
            refreshSession(),
            refreshSession(),
            freshAccessToken(),
        ]);
        expect(results.slice(0, 2)).toEqual([true, true]);
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('does nothing without a refresh token', async () => {
        await expect(refreshSession()).resolves.toBe(false);
        expect(post).not.toHaveBeenCalled();
    });

    it('signs the user out when the refresh token is rejected', async () => {
        signIn(jwt(-1));
        useUserProfileStore.setState({ profile: { name: 'x' } } as never);
        post.mockRejectedValue({ response: { status: 401 } });

        await expect(refreshSession()).resolves.toBe(false);

        const auth = useAuthStore.getState();
        expect(auth.isAuthenticated).toBe(false);
        expect(auth.accessToken).toBe('');
        expect(auth.sessionExpired).toBe(true);
    });

    it('keeps the session through network and server failures', async () => {
        signIn(jwt(-1));
        post.mockRejectedValueOnce({ request: {} });
        await expect(refreshSession()).resolves.toBe(false);
        post.mockRejectedValueOnce({ response: { status: 503 } });
        await expect(refreshSession()).resolves.toBe(false);
        post.mockResolvedValueOnce({ data: {} });
        await expect(refreshSession()).resolves.toBe(false);
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(useAuthStore.getState().sessionExpired).toBe(false);
    });

    it('freshAccessToken only refreshes a token that is about to expire', async () => {
        const valid = jwt(3600);
        signIn(valid);
        await expect(freshAccessToken()).resolves.toBe(valid);
        expect(post).not.toHaveBeenCalled();

        signIn(jwt(5));
        const next = jwt(3600);
        post.mockResolvedValue(refreshed(next));
        await expect(freshAccessToken()).resolves.toBe(next);
    });

    it('a fresh login clears the session expired notice', () => {
        expireSession();
        expect(useAuthStore.getState().sessionExpired).toBe(true);
        useAuthStore.getState().setCredentials('a@b.co', 'a', 'r');
        expect(useAuthStore.getState().sessionExpired).toBe(false);
    });

    describe('axios interceptors', () => {
        function client() {
            const handlers: { request: any; response: any } = {
                request: null,
                response: null,
            };
            const instance: any = {
                interceptors: {
                    request: { use: (fn: unknown) => (handlers.request = fn) },
                    response: {
                        use: (_ok: unknown, fn: unknown) =>
                            (handlers.response = fn),
                    },
                },
                request: vi.fn().mockResolvedValue({ data: 'replayed' }),
            };
            installTokenRefresh(instance);
            return { instance, ...handlers, handlers };
        }

        it('sends the current token and renews an expiring one first', async () => {
            const { handlers } = client();
            signIn(jwt(3600));
            const current = useAuthStore.getState().accessToken;
            const cfg = await handlers.request({ url: '/x', headers: {} });
            expect(cfg.headers.Authorization).toBe(`Bearer ${current}`);

            signIn(jwt(1));
            const next = jwt(3600);
            post.mockResolvedValue(refreshed(next));
            const cfg2 = await handlers.request({ url: '/x', headers: {} });
            expect(cfg2.headers.Authorization).toBe(`Bearer ${next}`);
        });

        it('sends no header when signed out and skips the refresh call itself', async () => {
            const { handlers } = client();
            const cfg = await handlers.request({ url: '/x', headers: {} });
            expect(cfg.headers.Authorization).toBeUndefined();
            signIn(jwt(-1));
            const refreshCall = { url: '/v1/users/refresh-token', headers: {} };
            expect(await handlers.request(refreshCall)).toBe(refreshCall);
            expect(post).not.toHaveBeenCalled();
        });

        it('refreshes and replays a 401 once', async () => {
            const { handlers, instance } = client();
            signIn(jwt(3600));
            post.mockResolvedValue(refreshed(jwt(7200)));
            const config: any = {
                url: '/v1/shelves',
                headers: { Authorization: 'Bearer old' },
            };
            const result = await handlers.response({
                config,
                response: { status: 401 },
            });
            expect(result).toEqual({ data: 'replayed' });
            expect(instance.request).toHaveBeenCalledWith(config);
            expect(config._retried).toBe(true);

            const again = handlers.response({
                config,
                response: { status: 401 },
            });
            await expect(again).rejects.toMatchObject({
                response: { status: 401 },
            });
        });

        it('passes other failures through untouched', async () => {
            const { handlers } = client();
            signIn(jwt(3600));
            const headers = { Authorization: 'Bearer t' };
            for (const error of [
                { config: { url: '/x', headers }, response: { status: 500 } },
                {
                    config: { url: '/x', headers: {} },
                    response: { status: 401 },
                },
                {
                    config: { url: '/v1/users/refresh-token', headers },
                    response: { status: 401 },
                },
                { response: { status: 401 } },
            ]) {
                await expect(handlers.response(error)).rejects.toBe(error);
            }
            expect(post).not.toHaveBeenCalled();
        });

        it('rejects the original error when the refresh fails', async () => {
            const { handlers, instance } = client();
            signIn(jwt(3600));
            post.mockRejectedValue({ response: { status: 401 } });
            const error = {
                config: { url: '/x', headers: { Authorization: 'Bearer t' } },
                response: { status: 401 },
            };
            await expect(handlers.response(error)).rejects.toBe(error);
            expect(instance.request).not.toHaveBeenCalled();
            expect(useAuthStore.getState().sessionExpired).toBe(true);
        });
    });

    describe('background timer', () => {
        it('refreshes shortly before expiry and schedules the next one', async () => {
            vi.useFakeTimers();
            signIn(jwt(100));
            post.mockImplementation(async () => refreshed(jwt(100)));
            const stop = startTokenRefreshTimer();

            await vi.advanceTimersByTimeAsync(69_000);
            expect(post).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(2_000);
            expect(post).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(71_000);
            expect(post).toHaveBeenCalledTimes(2);
            stop();
        });

        it('does nothing when signed out and stops on cleanup', async () => {
            vi.useFakeTimers();
            const stop = startTokenRefreshTimer();
            await vi.advanceTimersByTimeAsync(3_600_000);
            expect(post).not.toHaveBeenCalled();
            signIn(jwt(100));
            stop();
            await vi.advanceTimersByTimeAsync(3_600_000);
            expect(post).not.toHaveBeenCalled();
        });

        it('refreshes when the tab becomes visible with an expired token', async () => {
            vi.useFakeTimers();
            signIn(jwt(3600));
            const stop = startTokenRefreshTimer();
            signIn(jwt(-10)); // laptop slept past expiry
            post.mockResolvedValue(refreshed(jwt(3600)));
            document.dispatchEvent(new Event('visibilitychange'));
            await vi.advanceTimersByTimeAsync(0);
            expect(post).toHaveBeenCalledTimes(1);
            stop();
        });
    });
});
