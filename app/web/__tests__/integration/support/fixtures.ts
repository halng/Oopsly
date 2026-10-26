import { test as base, expect, type Page } from '@playwright/test';
import { COVERAGE_ENABLED, coverageReport } from './coverage';
import { defaultStubs } from './data';
import { wiremock } from './wiremock';

/** Same shape zustand `persist` writes for the auth store. */
export const AUTH_STORAGE = {
    state: {
        isAuthenticated: true,
        userEmail: 'learner@oopsly.app',
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
    },
    version: 0,
};

export async function signIn(page: Page) {
    await page.addInitScript((auth) => {
        // Seed once, so a logout inside the test is not undone by a reload.
        if (!localStorage.getItem('oopsly-auth')) {
            localStorage.setItem('oopsly-auth', JSON.stringify(auth));
        }
    }, AUTH_STORAGE);
}

interface Options {
    /** Start with a stored session (default). Set false for public screens. */
    signedIn: boolean;
}

export const test = base.extend<
    Options & { mock: typeof wiremock; coverage: void }
>({
    signedIn: [true, { option: true }],

    mock: [
        async ({}, run) => {
            await wiremock.reset();
            await wiremock.stub(defaultStubs());
            await run(wiremock);
            // A request no stub answered means the test data is incomplete.
            expect(
                await wiremock.unmatched(),
                'requests without a WireMock stub'
            ).toEqual([]);
        },
        { auto: true },
    ],

    // Chromium V8 coverage of the app bundles, merged into one report at teardown.
    coverage: [
        async ({ page }, run) => {
            if (!COVERAGE_ENABLED) return run();
            await page.coverage.startJSCoverage({ resetOnNavigation: false });
            await run();
            const entries = await page.coverage.stopJSCoverage();
            await coverageReport().add(entries);
        },
        { auto: true },
    ],

    page: async ({ page, signedIn, mock }, run) => {
        void mock;
        if (signedIn) await signIn(page);
        await run(page);
    },
});

export { expect };
