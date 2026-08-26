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

import {
  apiOk,
  IDS,
  mockCards,
  mockDiscoverPage,
  mockProfile,
  mockShelvesPage,
  mockStats,
  mockSubject,
  mockTestSuites,
  USER,
} from "../fixtures/api";

const API = "**/api/v1/oopsly";

export type MockApiOptions = {
  emptyShelves?: boolean;
  emptyDiscover?: boolean;
  emptyCards?: boolean;
  profileError?: boolean;
  statsError?: boolean;
};

function authPayload(email = USER.email) {
  return {
    state: {
      isAuthenticated: true,
      userEmail: email,
      accessToken: "cypress-access-token",
      refreshToken: "cypress-refresh-token",
    },
    version: 0,
  };
}

declare global {
  namespace Cypress {
    interface Chainable {
      tid(id: string): Chainable<JQuery<HTMLElement>>;
      seedAuth(email?: string): Chainable<void>;
      clearAuth(): Chainable<void>;
      mockCommonApis(options?: MockApiOptions): Chainable<void>;
      visitAuthed(path: string, options?: MockApiOptions): Chainable<void>;
      assertRgb(
        property: string,
        expected: string,
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add("tid", (id: string) => cy.get(`[data-testid="${id}"]`));

Cypress.Commands.add("seedAuth", (email = USER.email) => {
  cy.window({ log: false }).then((win) => {
    win.localStorage.setItem("auth-storage", JSON.stringify(authPayload(email)));
  });
});

Cypress.Commands.add("clearAuth", () => {
  cy.clearLocalStorage();
});

Cypress.Commands.add("mockCommonApis", (options: MockApiOptions = {}) => {
  cy.intercept("GET", `${API}/users/validate`, apiOk(null, "Valid token")).as(
    "validateToken",
  );
  cy.intercept("POST", `${API}/users/refresh-token`, {
    statusCode: 200,
    body: apiOk({
      access_token: "cypress-access-token",
      refresh_token: "cypress-refresh-token",
      token_type: "Bearer",
    }),
  }).as("refreshToken");

  if (options.profileError) {
    cy.intercept("GET", `${API}/user/profile`, {
      statusCode: 500,
      body: { isSuccess: false, message: "Profile unavailable", data: null },
    }).as("profile");
  } else {
    cy.intercept("GET", `${API}/user/profile`, apiOk(mockProfile)).as("profile");
  }

  cy.intercept("PATCH", `${API}/user/profile`, (req) => {
    req.reply(
      apiOk({
        ...mockProfile,
        ...req.body,
      }),
    );
  }).as("updateProfile");

  cy.intercept("PATCH", `${API}/user/settings`, (req) => {
    req.reply(
      apiOk({
        ...mockProfile,
        settings: {
          ...mockProfile.settings,
          ...req.body,
        },
      }),
    );
  }).as("updateSettings");

  if (options.statsError) {
    cy.intercept("GET", `${API}/users/me/stats`, {
      statusCode: 500,
      body: { isSuccess: false, message: "Stats unavailable", data: null },
    }).as("stats");
  } else {
    cy.intercept("GET", `${API}/users/me/stats`, apiOk(mockStats)).as("stats");
  }

  cy.intercept(
    "GET",
    `${API}/shelves*`,
    apiOk(
      options.emptyShelves
        ? {
            entities: [],
            totalElements: 0,
            totalPages: 0,
            currentPage: 0,
            totalItems: 0,
            hasNextPage: false,
          }
        : mockShelvesPage,
    ),
  ).as("shelves");

  cy.intercept(
    "GET",
    `${API}/shelves/*/test-suites*`,
    apiOk(mockTestSuites),
  ).as("testSuites");

  cy.intercept("POST", `${API}/shelves`, (req) => {
    req.reply(
      apiOk({
        id: "shelf-new",
        icon: req.body?.icon ?? "📚",
        name: req.body?.name ?? "New Shelf",
        description: req.body?.description ?? null,
        subjects: [],
      }),
    );
  }).as("createShelf");

  cy.intercept(
    "GET",
    `${API}/discover*`,
    apiOk(
      options.emptyDiscover
        ? { entities: [], totalItems: 0, hasNextPage: false }
        : mockDiscoverPage,
    ),
  ).as("discover");

  cy.intercept("POST", `${API}/discover/*/clone`, apiOk(null, "Cloned")).as(
    "cloneDeck",
  );

  cy.intercept(
    "GET",
    `${API}/shelves/*/subjects/${IDS.subject}`,
    apiOk(mockSubject),
  ).as("subject");

  cy.intercept(
    "GET",
    `${API}/shelves/*/subjects/*/cards*`,
    apiOk(
      options.emptyCards
        ? {
            entities: [],
            totalPages: 0,
            currentPage: 0,
            totalItems: 0,
            hasNextPage: false,
          }
        : mockCards,
    ),
  ).as("cards");

  cy.intercept("POST", `${API}/shelves/*/subjects/*/cards`, apiOk(null)).as(
    "createCards",
  );
  cy.intercept("PUT", `${API}/shelves/*/subjects/*/cards/*`, apiOk(null)).as(
    "updateCard",
  );
  cy.intercept("PATCH", `${API}/shelves/*/subjects/*/cards/*`, apiOk(null)).as(
    "deleteCard",
  );
  cy.intercept(
    "PUT",
    `${API}/shelves/*/subjects/*/cards/difficulty`,
    apiOk(null),
  ).as("updateDifficulty");

  cy.intercept("POST", `${API}/otp*`, apiOk(null, "OTP sent successfully")).as(
    "createOtp",
  );
  cy.intercept("POST", `${API}/otp/validate`, {
    statusCode: 200,
    body: apiOk({
      access_token: "cypress-access-token",
      refresh_token: "cypress-refresh-token",
      token_type: "Bearer",
    }),
  }).as("validateOtp");
});

Cypress.Commands.add(
  "visitAuthed",
  (path: string, options: MockApiOptions = {}) => {
    cy.mockCommonApis(options);
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "auth-storage",
          JSON.stringify(authPayload()),
        );
      },
    });
  },
);

Cypress.Commands.add(
  "assertRgb",
  { prevSubject: "element" },
  (subject, property: string, expected: string) => {
    cy.wrap(subject).should(($el) => {
      const value = window.getComputedStyle($el[0]).getPropertyValue(property);
      const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
      const target = expected.replace(/\s+/g, " ").trim().toLowerCase();
      expect(normalized, `${property}`).to.eq(target);
    });
  },
);

export {};
