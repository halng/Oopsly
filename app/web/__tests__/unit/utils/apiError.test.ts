import { describe, expect, it } from 'vitest';
import {
    ApiError,
    errorKind,
    failureTitle,
    humanizeError,
    humanizeResponse,
    isBatchBlocking,
    kindFromStatus,
} from '@/utils/apiError';

describe('kindFromStatus', () => {
    it.each([
        [401, 'session'],
        [403, 'forbidden'],
        [404, 'notFound'],
        [409, 'conflict'],
        [429, 'rateLimited'],
        [422, 'validation'],
        [503, 'server'],
    ])('maps %i to %s', (status, kind) => {
        expect(kindFromStatus(status)).toBe(kind);
    });
});

describe('humanizeError', () => {
    it('keeps readable validation messages from the API', () => {
        const err = new ApiError('name is required', 'validation', 400);
        expect(humanizeError(err)).toBe('Name is required.');
    });

    it('hides technical details on server errors', () => {
        const err = new ApiError(
            'java.lang.NullPointerException at Foo.bar(Foo.java:1)',
            'server',
            500
        );
        expect(humanizeError(err)).toMatch(/something went wrong on our side/i);
    });

    it('does not echo technical text even for client errors', () => {
        const err = new ApiError(
            'org.hibernate.SQLException',
            'validation',
            400
        );
        expect(humanizeError(err)).toMatch(/not valid/i);
    });

    it('prefers our wording over a bare HTTP reason phrase', () => {
        expect(humanizeError(new ApiError('Forbidden', 'forbidden', 403))).toBe(
            "You don't have permission to do that."
        );
        expect(
            humanizeError(new ApiError('Not Found', 'validation', 400))
        ).toMatch(/not valid/i);
    });

    it('keeps a specific permission message', () => {
        expect(
            humanizeError(
                new ApiError(
                    'Your subscription plan does not include this resource.',
                    'forbidden',
                    403
                )
            )
        ).toBe('Your subscription plan does not include this resource.');
    });

    it('explains network and timeout failures', () => {
        expect(
            humanizeError(new ApiError('Network error occurred', 'network'))
        ).toMatch(/reach the server/i);
        expect(humanizeError(new ApiError('x', 'timeout'))).toMatch(
            /too long/i
        );
    });

    it('falls back for non-Error values', () => {
        expect(humanizeError('boom')).toMatch(/something went wrong/i);
    });
});

describe('failureTitle', () => {
    it('describes the failed action by method', () => {
        expect(failureTitle('post')).toBe("Couldn't create that");
        expect(failureTitle('PATCH')).toBe("Couldn't save your changes");
        expect(failureTitle('DELETE')).toBe("Couldn't delete that");
        expect(failureTitle('GET')).toBe('Something went wrong');
    });
});

describe('humanizeResponse / isBatchBlocking', () => {
    it('humanizes by status code', () => {
        expect(
            humanizeResponse({ statusCode: 404, message: 'Not found' })
        ).toMatch(/could not find/i);
        expect(
            humanizeResponse({ statusCode: 400, message: 'Title is required' })
        ).toBe('Title is required.');
    });

    it('treats status 0 as a network failure', () => {
        expect(humanizeResponse({ statusCode: 0, message: 'x' })).toMatch(
            /reach the server/i
        );
    });

    it('flags failures that will repeat for every following request', () => {
        for (const statusCode of [0, 401, 429, 500, 503]) {
            expect(isBatchBlocking({ statusCode })).toBe(true);
        }
        for (const statusCode of [400, 403, 404, 409, 422]) {
            expect(isBatchBlocking({ statusCode })).toBe(false);
        }
    });
});

describe('errorKind', () => {
    it('reads the kind from an ApiError', () => {
        expect(errorKind(new ApiError('x', 'timeout'))).toBe('timeout');
    });

    it('detects an offline browser for unknown errors', () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: false,
        });
        try {
            expect(errorKind(new Error('x'))).toBe('offline');
            expect(humanizeError(new Error('x'))).toMatch(/offline/i);
        } finally {
            Object.defineProperty(navigator, 'onLine', {
                configurable: true,
                value: true,
            });
        }
    });

    it('keeps readable messages of unknown errors but not network noise', () => {
        expect(humanizeError(new Error('Something specific'))).toBe(
            'Something specific.'
        );
        expect(humanizeError(new Error('Network error occurred'))).toMatch(
            /something went wrong/i
        );
    });
});
