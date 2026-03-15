// cypress/support/e2e.ts
// Global helpers, custom commands, and hooks for all E2E tests

// ─── Hooks ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  // Suppress uncaught exceptions from the app that are not test-related
  // (e.g. async React state updates on unmounted components during navigation)
  Cypress.on('uncaught:exception', (err) => {
    if (
      err.message.includes('ResizeObserver loop limit exceeded') ||
      err.message.includes('Cannot update a component') ||
      err.message.includes('unmounted component')
    ) {
      return false; // Don't fail the test for these known non-critical errors
    }
  });
});

// ─── Custom Commands ──────────────────────────────────────────────────────────

/**
 * cy.login(email?)
 * Completes the full email + OTP login flow.
 * Uses environment variable CYPRESS_TEST_OTP when set (for CI).
 */
Cypress.Commands.add('login', (email = 'test@example.com') => {
  const otp = Cypress.env('TEST_OTP') || '123456';
  const digits = otp.split('');

  cy.visit('/');
  cy.get('[data-testid="get-started-button"]').click();
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="send-otp-button"]').click();

  digits.forEach((digit, i) => {
    cy.get(`[data-testid="otp-input-${i}"]`).type(digit);
  });

  cy.get('[data-testid="home-screen"]').should('exist');
});

/**
 * cy.logout()
 * Logs out the current user via the Profile screen.
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="profile-icon"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.get('[data-testid="confirm-logout-button"]').click();
  cy.get('[data-testid="get-started-button"]').should('be.visible');
});

/**
 * cy.createShelf(name)
 * Creates a shelf via the UI and waits for the toast confirmation.
 */
Cypress.Commands.add('createShelf', (name: string) => {
  cy.get('[data-testid="add-shelf-button"]').click();
  cy.get('[data-testid="shelf-name-input"]').type(name);
  cy.get('[data-testid="save-shelf-button"]').click();
  cy.contains(/created successfully/i).should('be.visible');
});

/**
 * cy.createSubject(shelfName, subjectName)
 * Navigates into a shelf and creates a subject.
 */
Cypress.Commands.add('createSubject', (shelfName: string, subjectName: string) => {
  cy.contains(shelfName).click();
  cy.get('[data-testid="add-subject-button"]').click();
  cy.get('[data-testid="subject-name-input"]').type(subjectName);
  cy.get('[data-testid="save-subject-button"]').click();
  cy.contains(/created successfully/i).should('be.visible');
  cy.get('[data-testid="back-button"]').click();
});

/**
 * cy.createTestSuite(shelfName, title)
 * Navigates to the shelf and creates a test suite.
 */
Cypress.Commands.add('createTestSuite', (shelfName: string, title: string) => {
  cy.contains(shelfName).parent().find('[data-testid="add-test-suite-button"]').click();
  cy.get('[data-testid="test-suite-title-input"]').type(title);
  cy.get('[data-testid="save-test-suite-button"]').click();
  cy.contains(/created successfully/i).should('be.visible');
});

/**
 * cy.addCard(front, back)
 * Opens the add card modal, fills in, and saves.
 * Assumes already on the subject detail screen.
 */
Cypress.Commands.add('addCard', (front: string, back: string) => {
  cy.get('[data-testid="add-card-button"]').click();
  cy.get('[data-testid="card-front-input"]').type(front);
  cy.get('[data-testid="card-back-input"]').type(back);
  cy.get('[data-testid="save-card-button"]').click();
  cy.contains(/created successfully/i).should('be.visible');
});

/**
 * cy.addQuestion(type, content, options?, correctIndices?, answer?)
 * Opens the add question modal and adds a question of the given type.
 * Assumes already on the test suite detail screen.
 */
Cypress.Commands.add(
  'addQuestion',
  (
    type: 'SINGLE CHOICE' | 'MULTIPLE CHOICE' | 'TRUE FALSE' | 'FILL IN THE BLANK',
    content: string,
    options?: string[],
    correctIndices?: number[],
    answer?: string
  ) => {
    cy.get('[data-testid="add-question-button"]').click();
    cy.contains(type).click();
    cy.get('[placeholder="Enter question text"]').type(content);

    if (type === 'FILL IN THE BLANK' && answer) {
      cy.get('[placeholder="Expected answer (e.g. Washington)"]').type(answer);
    } else if (options && correctIndices) {
      options.forEach((opt, i) => {
        cy.get(`[placeholder="Option ${String.fromCharCode(65 + i)}"]`).type(opt);
      });
      correctIndices.forEach((idx) => {
        cy.get(`[data-testid="option-selector-${idx}"]`).click();
      });
    }

    cy.contains('Save Question').click();
    cy.contains(/created successfully/i).should('be.visible');
  }
);

/**
 * cy.interceptApiError(method, urlPattern, statusCode, message)
 * Shorthand to intercept an API call and simulate a specific HTTP error.
 */
Cypress.Commands.add(
  'interceptApiError',
  (method: string, urlPattern: string, statusCode: number, message: string) => {
    cy.intercept(method as any, urlPattern, {
      statusCode,
      body: { isSuccess: false, data: null, message },
    });
  }
);

// ─── TypeScript Declaration Augmentation ──────────────────────────────────────
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
    }
  }
}
