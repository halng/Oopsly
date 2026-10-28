import axios, {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore, useUserProfileStore } from '@/store';

/** Refresh this long before the access token really expires. */
const EXPIRY_SKEW_SECONDS = 30;
const REFRESH_PATH = '/v1/users/refresh-token';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** `exp` of a JWT in seconds, or null when the token is not a readable JWT. */
export function tokenExpiry(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const exp = (JSON.parse(json) as { exp?: unknown }).exp;
        return typeof exp === 'number' ? exp : null;
    } catch {
        return null;
    }
}

export function isExpiring(token: string, skewSeconds = EXPIRY_SKEW_SECONDS) {
    const exp = tokenExpiry(token);
    return exp !== null && exp - skewSeconds <= Date.now() / 1000;
}

function authUrl() {
    return (process.env.NEXT_PUBLIC_AUTH_URL || '').replace(/\/$/, '');
}

/** Ends the session for good: the guard sends the user to the login page. */
export function expireSession() {
    const auth = useAuthStore.getState();
    auth.clearAuth();
    auth.setSessionExpired(true);
    useUserProfileStore.getState().clearProfile();
}

let inflight: Promise<boolean> | null = null;

/**
 * Trades the refresh token for a new access token. Concurrent callers share one
 * request. Resolves true when the store holds a fresh access token.
 *
 * A rejected refresh token (4xx) ends the session; a network or server failure
 * keeps it, so a flaky connection does not sign anyone out.
 */
export function refreshSession(): Promise<boolean> {
    if (inflight) return inflight;
    const { refreshToken, userEmail } = useAuthStore.getState();
    if (!refreshToken || !userEmail) return Promise.resolve(false);

    inflight = axios
        .post(
            `${authUrl()}${REFRESH_PATH}`,
            { refresh_token: refreshToken, user_email: userEmail },
            { timeout: 15000 }
        )
        .then((res) => {
            const data = res.data?.data as
                { access_token?: string; refresh_token?: string } | undefined;
            if (!data?.access_token) return false;
            useAuthStore
                .getState()
                .setAuthTokens(
                    data.access_token,
                    data.refresh_token || refreshToken
                );
            return true;
        })
        .catch((error: AxiosError) => {
            const status = error.response?.status;
            if (status && status >= 400 && status < 500) expireSession();
            return false;
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

/** The access token, refreshed first when it is about to expire. */
export async function freshAccessToken(): Promise<string> {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && isExpiring(accessToken)) await refreshSession();
    return useAuthStore.getState().accessToken;
}

function isRefreshCall(config?: { url?: string }) {
    return !!config?.url?.endsWith(REFRESH_PATH);
}

/**
 * Makes `client` send the access token, refresh it before it expires, and replay a
 * request once when the server still answers 401 (clock skew, rotated keys, ...).
 */
export function installTokenRefresh(client: AxiosInstance) {
    client.interceptors.request.use(async (config) => {
        if (typeof window === 'undefined' || isRefreshCall(config)) {
            return config;
        }
        const token = await freshAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const config = error.config as RetriableConfig | undefined;
            const { refreshToken } = useAuthStore.getState();
            const replayable =
                error.response?.status === 401 &&
                !!config &&
                !config._retried &&
                !isRefreshCall(config) &&
                !!refreshToken &&
                !!config.headers?.Authorization;
            if (!replayable) return Promise.reject(error);

            config._retried = true;
            if (await refreshSession()) return client.request(config);
            return Promise.reject(error);
        }
    );
}

/**
 * Refreshes in the background just before expiry, and again when the tab wakes up
 * (browsers throttle timers in hidden tabs). Returns a cleanup function.
 */
export function startTokenRefreshTimer(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        const { accessToken, isAuthenticated } = useAuthStore.getState();
        const exp = accessToken ? tokenExpiry(accessToken) : null;
        if (!isAuthenticated || exp === null) return;
        const wait = Math.max(
            exp * 1000 - Date.now() - EXPIRY_SKEW_SECONDS * 1000,
            0
        );
        timer = setTimeout(
            () => void refreshSession().then((ok) => ok && schedule()),
            Math.min(wait, 2 ** 31 - 1)
        );
    };

    const onVisible = () => {
        if (document.visibilityState !== 'visible') return;
        const { accessToken, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !accessToken) return;
        if (isExpiring(accessToken)) void refreshSession().then(schedule);
        else schedule();
    };

    const unsubscribe = useAuthStore.subscribe((state, previous) => {
        if (state.accessToken !== previous.accessToken) schedule();
    });
    document.addEventListener('visibilitychange', onVisible);
    schedule();

    return () => {
        if (timer) clearTimeout(timer);
        unsubscribe();
        document.removeEventListener('visibilitychange', onVisible);
    };
}
