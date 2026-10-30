export type ApiErrorKind =
    | 'offline'
    | 'network'
    | 'timeout'
    | 'session'
    | 'validation'
    | 'forbidden'
    | 'notFound'
    | 'conflict'
    | 'rateLimited'
    | 'server'
    | 'unknown';

/**
 * Error thrown by the axios clients. `message` keeps the raw text so existing
 * callers are unchanged; use `humanizeError` to get something fit for users.
 */
export class ApiError extends Error {
    readonly status?: number;
    readonly kind: ApiErrorKind;

    constructor(message: string, kind: ApiErrorKind, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.kind = kind;
        this.status = status;
    }
}

export function kindFromStatus(status: number): ApiErrorKind {
    if (status === 401) return 'session';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'notFound';
    if (status === 409) return 'conflict';
    if (status === 429) return 'rateLimited';
    if (status >= 500) return 'server';
    if (status >= 400) return 'validation';
    return 'unknown';
}

const FALLBACK: Record<ApiErrorKind, string> = {
    offline: "You're offline. Check your connection and try again.",
    network:
        "We couldn't reach the server. Check your connection and try again.",
    timeout: 'The server took too long to respond. Please try again.',
    session: 'Your session has expired. Please sign in again.',
    validation:
        'Some of the information is not valid. Please check it and try again.',
    forbidden: "You don't have permission to do that.",
    notFound:
        'We could not find what you were looking for. It may have been removed.',
    conflict: 'This conflicts with something that already exists.',
    rateLimited: 'Too many requests. Please wait a moment and try again.',
    server: 'Something went wrong on our side. Please try again in a moment.',
    unknown: 'Something went wrong. Please try again.',
};

// Raw server text is only shown when it reads like a sentence meant for people.
const TECHNICAL =
    /exception|stack ?trace|\bat [\w.$]+\(|sql|null ?pointer|\bjava\.|\bpython\b|traceback|status \d{3}|<\/?\w+>|^\s*[{[]/i;

// Bare HTTP reason phrases say less than our own wording does.
const GENERIC =
    /^(forbidden|unauthori[sz]ed|not found|bad request|conflict|internal server error|error|failed)\.?$/i;

function isHumanMessage(message: string | undefined): message is string {
    if (!message) return false;
    const text = message.trim();
    return (
        text.length >= 3 &&
        text.length <= 160 &&
        !TECHNICAL.test(text) &&
        !GENERIC.test(text)
    );
}

function sentence(text: string) {
    const trimmed = text.trim();
    const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}

export function errorKind(error: unknown): ApiErrorKind {
    if (error instanceof ApiError) return error.kind;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'unknown';
}

/**
 * Turn any thrown error into a short, friendly reason for the user.
 * Validation and conflict messages from the API are kept when readable;
 * server and network failures never leak technical details.
 */
export function humanizeError(error: unknown): string {
    const kind = errorKind(error);
    const raw = error instanceof Error ? error.message : undefined;
    if (
        (kind === 'validation' ||
            kind === 'conflict' ||
            kind === 'forbidden') &&
        isHumanMessage(raw)
    ) {
        return sentence(raw);
    }
    if (
        kind === 'unknown' &&
        isHumanMessage(raw) &&
        !/^network error/i.test(raw)
    ) {
        return sentence(raw);
    }
    return FALLBACK[kind];
}

const ACTION_BY_METHOD: Record<string, string> = {
    POST: "Couldn't create that",
    PUT: "Couldn't save your changes",
    PATCH: "Couldn't save your changes",
    DELETE: "Couldn't delete that",
};

/** Headline for a failed mutation, e.g. "Couldn't save your changes". */
export function failureTitle(method: string): string {
    return ACTION_BY_METHOD[method.toUpperCase()] ?? 'Something went wrong';
}

/** Humanizes a failed `ApiResponse` (status 0 means no response arrived). */
export function humanizeResponse(res: {
    statusCode: number;
    message: string;
}): string {
    const status = res.statusCode;
    const kind = status > 0 ? kindFromStatus(status) : 'network';
    return humanizeError(new ApiError(res.message, kind, status || undefined));
}

/** Failures that will repeat for every following request in a batch. */
export function isBatchBlocking(res: { statusCode: number }): boolean {
    const status = res.statusCode;
    return status === 0 || status === 401 || status === 429 || status >= 500;
}
