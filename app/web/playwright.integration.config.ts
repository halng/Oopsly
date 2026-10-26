import { defineConfig, devices } from '@playwright/test';
import {
    API_URL,
    AUTH_URL,
    GAME_URL,
} from './__tests__/integration/support/env';

const PORT = 3100;

/**
 * Integration run: the real Next.js app in a real browser, with WireMock
 * (docker-compose.integration.yml) answering for the api, auth and game
 * services. Stubs are shared state, so specs run one at a time.
 */
export default defineConfig({
    testDir: './__tests__/integration/specs',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ['list'],
        [
            'html',
            { open: 'never', outputFolder: 'playwright-report-integration' },
        ],
    ],
    globalSetup: './__tests__/integration/support/global-setup.ts',
    globalTeardown: './__tests__/integration/support/global-teardown.ts',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `pnpm exec next dev -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 180 * 1000,
        env: {
            NEXT_PUBLIC_API_URL: API_URL,
            NEXT_PUBLIC_AUTH_URL: AUTH_URL,
            NEXT_PUBLIC_GAME_API_URL: GAME_URL,
            NEXT_DIST_DIR: '.next-integration',
        },
    },
});
