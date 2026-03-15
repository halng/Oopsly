import { defineConfig } from 'cypress';

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
    },
    retries: {
      runMode: 2,      // retry failed tests up to 2 times in headless CI
      openMode: 0,     // no retries in interactive mode
    },
  },
});
