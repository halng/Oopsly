import { defineConfig } from 'cypress';
import { WireMock } from 'wiremock-captain';
import { setupAllDefaultStubs } from './cypress/wiremock/setup';
import type { WireMockRegisterArgs } from './cypress/support/types';

const WIREMOCK_URL = process.env.WIREMOCK_URL ?? 'http://localhost:9009';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8081',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    viewportWidth: 390,
    viewportHeight: 844,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    chromeWebSecurity: false,
    env: {
      // Override in CI: CYPRESS_TEST_OTP=123456
      TEST_OTP: '123456',
      // Override in CI: WIREMOCK_URL=http://wiremock:8080
      WIREMOCK_URL,
    },
    retries: {
      runMode: 2,      // retry failed tests up to 2 times in headless CI
      openMode: 0,     // no retries in interactive mode
    },
    setupNodeEvents(on) {
      const wireMock = new WireMock(WIREMOCK_URL);

      on('task', {
        /**
         * Clears all WireMock stubs and request logs.
         * Call before each test to ensure a clean slate.
         */
        async 'wiremock:clearAll'() {
          try {
            await wireMock.clearAll();
          } catch {
            // WireMock not available — tests that rely on API stubs will fail naturally
            console.warn(`[WireMock] Server not reachable at ${WIREMOCK_URL}. API calls will not be mocked.`);
          }
          return null;
        },

        /**
         * Registers all default happy-path stubs covering every API endpoint.
         * Call after wiremock:clearAll to restore a predictable baseline.
         */
        async 'wiremock:setupDefaults'() {
          try {
            await setupAllDefaultStubs(wireMock);
          } catch {
            console.warn(`[WireMock] Could not register default stubs at ${WIREMOCK_URL}.`);
          }
          return null;
        },

        /**
         * Registers a single custom stub. Useful for simulating error scenarios
         * without replacing the full set of defaults.
         */
        async 'wiremock:register'(args: WireMockRegisterArgs) {
          await wireMock.register(args.request, args.response, args.features);
          return null;
        },
      });
    },
  },
});
