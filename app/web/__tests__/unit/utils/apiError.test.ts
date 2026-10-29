import { describe, expect, it } from 'vitest';
import {
    ApiError,
    failureTitle,
    humanizeError,
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
