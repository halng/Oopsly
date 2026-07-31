/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { defineConfig } from "cypress";

// CommonJS plugin (v3) — compatible with Cypress 14.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registerCodeCoverageTasks = require("@cypress/code-coverage/task");

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 800,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  env: {
    codeCoverage: {
      exclude: [
        "**/cypress/**",
        "**/node_modules/**",
        "**/__tests__/**",
        "**/__mocks__/**",
      ],
    },
  },
  e2e: {
    baseUrl: "http://localhost:8081",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      registerCodeCoverageTasks(on, config);
      return config;
    },
  },
});
