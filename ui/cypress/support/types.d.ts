// cypress/support/types.d.ts
// TypeScript type augmentation for custom Cypress commands.
// This file is picked up by the cypress/tsconfig.json automatically.

import type { IWireMockFeatures, IWireMockRequest, IWireMockResponse } from 'wiremock-captain';

/** Arguments for the wiremock:register Cypress task */
export interface WireMockRegisterArgs {
  request: IWireMockRequest;
  response: IWireMockResponse;
  features?: IWireMockFeatures;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /** Complete email + OTP login flow */
      login(email?: string): Chainable<void>;

      /** Log out via Profile screen */
      logout(): Chainable<void>;

      /** Create a shelf via the UI */
      createShelf(name: string): Chainable<void>;

      /** Navigate into a shelf and create a subject */
      createSubject(shelfName: string, subjectName: string): Chainable<void>;

      /** Create a test suite via the UI */
      createTestSuite(shelfName: string, title: string): Chainable<void>;

      /** Add a flashcard (must be on subject detail screen) */
      addCard(front: string, back: string): Chainable<void>;

      /** Add a question (must be on test suite detail screen) */
      addQuestion(
        type: 'SINGLE CHOICE' | 'MULTIPLE CHOICE' | 'TRUE FALSE' | 'FILL IN THE BLANK',
        content: string,
        options?: string[],
        correctIndices?: number[],
        answer?: string
      ): Chainable<void>;

      /** Intercept API call and return an error response */
      interceptApiError(
        method: string,
        urlPattern: string,
        statusCode: number,
        message: string
      ): Chainable<void>;

      /** Reset WireMock stubs to defaults */
      wiremockReset(): Chainable<void>;

      /** Register a custom WireMock stub for the current test */
      wiremockStub(request: object, response: object, features?: object): Chainable<void>;
    }
  }
}
