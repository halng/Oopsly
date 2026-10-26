import { WIREMOCK_URL } from './env';

const ADMIN = `${WIREMOCK_URL}/__admin`;

export interface Stub {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Exact path (no query string). */
    path: string;
    /** Query params that must match exactly. */
    query?: Record<string, string>;
    /** Body fields that must match (JSON equal-to-json, extra fields ignored). */
    bodyContains?: Record<string, unknown>;
    status?: number;
    body?: unknown;
    delayMs?: number;
    /** WireMock picks the lowest number: overrides use 1, defaults use 5. */
    priority?: number;
}

/** Spring-style envelope every service returns. */
export function envelope<T>(data: T, message = 'ok') {
    return {
        isSuccess: true,
        statusCode: 200,
        message,
        data,
        timestamp: '2026-01-01T00:00:00Z',
    };
}

export function failure(message: string, statusCode = 400) {
    return {
        isSuccess: false,
        statusCode,
        message,
        data: null,
        timestamp: '2026-01-01T00:00:00Z',
    };
}

export function page<T>(entities: T[]) {
    return {
        entities,
        currentPage: 1,
        totalItems: entities.length,
        totalPages: 1,
        hasNextPage: false,
    };
}

function toMapping(stub: Stub) {
    return {
        priority: stub.priority ?? 5,
        request: {
            method: stub.method,
            urlPath: stub.path,
            ...(stub.query && {
                queryParameters: Object.fromEntries(
                    Object.entries(stub.query).map(([k, v]) => [
                        k,
                        { equalTo: v },
                    ])
                ),
            }),
            ...(stub.bodyContains && {
                bodyPatterns: [
                    {
                        equalToJson: JSON.stringify(stub.bodyContains),
                        ignoreExtraElements: true,
                    },
                ],
            }),
        },
        response: {
            status: stub.status ?? 200,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: stub.body ?? null,
            ...(stub.delayMs && { fixedDelayMilliseconds: stub.delayMs }),
        },
    };
}

async function admin(path: string, init?: RequestInit) {
    const res = await fetch(`${ADMIN}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok)
        throw new Error(
            `WireMock ${path} failed: ${res.status} ${await res.text()}`
        );
    return res;
}

export const wiremock = {
    /** Drop every stub and the request journal. */
    reset: () => admin('/reset', { method: 'POST' }),

    /** Register stubs. Later `override` calls beat the defaults via priority. */
    async stub(stubs: Stub[]) {
        await admin('/mappings/import', {
            method: 'POST',
            body: JSON.stringify({
                mappings: stubs.map(toMapping),
            }),
        });
    },

    /** Replace one endpoint's answer for the current test. */
    override: (stub: Stub) => wiremock.stub([{ priority: 1, ...stub }]),

    /** Requests WireMock received that match, for asserting what the UI sent. */
    async requests(method: Stub['method'], path: string) {
        const res = await admin('/requests/find', {
            method: 'POST',
            body: JSON.stringify({ method, urlPath: path }),
        });
        const { requests } = (await res.json()) as {
            requests: {
                url: string;
                body: string;
                headers: Record<string, string>;
            }[];
        };
        return requests.map((r) => ({
            url: r.url,
            headers: r.headers,
            json: r.body
                ? (JSON.parse(r.body) as Record<string, unknown>)
                : null,
        }));
    },

    /** Anything the app called that no stub answered (a missing-stub bug). */
    async unmatched() {
        const res = await admin('/requests/unmatched');
        const { requests } = (await res.json()) as {
            requests: { method: string; url: string }[];
        };
        return requests.map((r) => `${r.method} ${r.url}`);
    },
};
