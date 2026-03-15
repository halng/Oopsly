// cypress/e2e/network-errors.cy.ts
// Cross-cutting: API & Network failure handling across all major features
// Verifies the app degrades gracefully when the backend is unavailable or returns errors.

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Network & API Error Handling - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.login();
      cy.get('[data-testid="home-screen"]').should("exist");
    });

    // ─── Global Network Failure ───────────────────────────────────────────────
    describe("Complete Network Loss", () => {
      it("shows a user-friendly error when the shelves endpoint is unavailable", () => {
        cy.intercept("GET", "**/shelves*", { forceNetworkError: true }).as(
          "getShelvesOffline",
        );

        cy.reload();
        cy.wait("@getShelvesOffline");
        cy.contains(
          /network error|failed to load|something went wrong/i,
        ).should("exist").and("be.visible");
      });

      it("shows a retry affordance after network error on home screen", () => {
        cy.intercept("GET", "**/shelves*", { forceNetworkError: true }).as(
          "getShelvesOffline",
        );
        cy.reload();
        cy.wait("@getShelvesOffline");
        cy.get('[data-testid="retry-button"]').should("exist").and("be.visible");
      });

      it("recovers from network error when retry is pressed", () => {
        let callCount = 0;
        cy.intercept("GET", "**/shelves*", (req) => {
          callCount++;
          if (callCount === 1) {
            req.destroy(); // Simulate network error on first call
          } else {
            req.reply({ isSuccess: true, data: [], message: "ok" }); // Succeed on retry
          }
        }).as("shelves");

        cy.reload();
        cy.wait("@shelves");
        cy.get('[data-testid="retry-button"]').should("exist").and("be.visible").click();
        cy.wait("@shelves");
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
      });
    });

    // ─── HTTP Error Status Codes ──────────────────────────────────────────────
    describe("HTTP 4xx Error Responses", () => {
      it("handles 400 Bad Request when creating a shelf", () => {
        cy.intercept("POST", "**/shelves*", {
          statusCode: 400,
          body: { isSuccess: false, message: "Invalid request data" },
        }).as("badShelf");

        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Bad Request Shelf");
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.wait("@badShelf");
        cy.contains(/invalid|bad request|failed/i).should("be.visible");
      });

      it("shows 401 Unauthorized toast and redirects to login", () => {
        cy.intercept("GET", "**/shelves*", {
          statusCode: 401,
          body: { isSuccess: false, message: "Unauthorized" },
        }).as("unauth");

        cy.reload();
        cy.wait("@unauth");
        // User should be kicked back to onboarding/login
        cy.get('[data-testid="get-started-button"]').should("exist");
      });

      it("handles 403 Forbidden when accessing restricted shelf", () => {
        cy.intercept("GET", "**/shelves/**", {
          statusCode: 403,
          body: { isSuccess: false, message: "Forbidden" },
        }).as("forbidden");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.wait("@forbidden");
        cy.contains(/access denied|forbidden|not authorized/i).should(
          "be.visible",
        );
      });

      it("handles 404 Not Found for a deleted shelf detail", () => {
        cy.intercept("GET", "**/shelves/**", {
          statusCode: 404,
          body: { isSuccess: false, message: "Not found" },
        }).as("notFound");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.wait("@notFound");
        cy.contains(/not found|doesn't exist|404/i).should("be.visible");
      });

      it("handles 422 Unprocessable Entity for question creation", () => {
        cy.intercept("POST", "**/questions*", {
          statusCode: 422,
          body: {
            isSuccess: false,
            message: "Invalid question data",
            errors: [
              { field: "options", message: "Must provide at least 2 options" },
            ],
          },
        }).as("invalidQuestion");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="test-suite-item"]').first().click();
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("FILL IN THE BLANK").click();
        cy.get('[placeholder="Enter question text"]').type("Test?");
        cy.get('[placeholder="Expected answer (e.g. Washington)"]').type(
          "Test Answer",
        );
        cy.contains("Save Question").click();

        cy.wait("@invalidQuestion");
        cy.contains(/invalid|failed|unprocessable/i).should("be.visible");
      });
    });

    describe("HTTP 5xx Error Responses", () => {
      it("handles 500 Internal Server Error on shelf list load", () => {
        cy.intercept("GET", "**/shelves*", {
          statusCode: 500,
          body: { isSuccess: false, message: "Internal Server Error" },
        }).as("serverError");

        cy.reload();
        cy.wait("@serverError");
        cy.contains(/something went wrong|server error|try again/i).should(
          "be.visible",
        );
      });

      it("handles 503 Service Unavailable gracefully", () => {
        cy.intercept("GET", "**/shelves*", {
          statusCode: 503,
          body: { isSuccess: false, message: "Service Unavailable" },
        }).as("unavailable");

        cy.reload();
        cy.wait("@unavailable");
        cy.contains(/unavailable|down|later/i).should("be.visible");
      });

      it("handles gateway timeout (504) on long-running operations", () => {
        cy.intercept("POST", "**/test-suites*", {
          statusCode: 504,
          body: { isSuccess: false, message: "Gateway Timeout" },
        }).as("timeout");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="add-test-suite-button"]').click();
        cy.get('[data-testid="test-suite-title-input"]').type("Timeout Suite");
        cy.get('[data-testid="save-test-suite-button"]').click();

        cy.wait("@timeout");
        cy.contains(/timeout|failed|try again/i).should("be.visible");
      });
    });

    // ─── Slow Network / Loading States ────────────────────────────────────────
    describe("Slow Network / Loading States", () => {
      it("shows a loading skeleton/spinner while shelves load", () => {
        cy.intercept("GET", "**/shelves*", (req) => {
          req.on("response", (res) => {
            res.setDelay(2000); // 2s delay
          });
        }).as("slowShelves");

        cy.reload();
        cy.get('[data-testid="loading-indicator"]').should("be.visible");
        cy.wait("@slowShelves");
        cy.get('[data-testid="loading-indicator"]').should("not.exist");
      });

      it("shows loading while questions are being fetched", () => {
        cy.intercept("GET", "**/questions*", (req) => {
          req.on("response", (res) => {
            res.setDelay(1500);
          });
        }).as("slowQuestions");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="test-suite-item"]').first().click();
        cy.get('[data-testid="loading-question-indicator"]').should(
          "be.visible",
        );
        cy.wait("@slowQuestions");
      });

      it("does not allow double-clicking Save to create duplicate shelves", () => {
        cy.intercept("POST", "**/shelves*", (req) => {
          req.on("response", (res) => {
            res.setDelay(500);
          });
          req.reply({
            isSuccess: true,
            data: { id: "new-1", name: "Double Click Test" },
            message: "OK",
          });
        }).as("createShelf");

        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Double Click Test");
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.get('[data-testid="save-shelf-button"]').click(); // double click

        cy.wait("@createShelf");
        // Button should have been disabled after first click
        cy.get('[data-testid="shelf-item"]')
          .filter(':contains("Double Click Test")')
          .should("have.length", 1);
      });
    });

    // ─── Paginated / Large Data Edge Cases ────────────────────────────────────
    describe("Large Data Sets", () => {
      it("renders a shelf list with 50+ shelves without crashing", () => {
        const shelves = Array.from({ length: 50 }, (_, i) => ({
          id: `shelf-${i}`,
          name: `Shelf ${i + 1}`,
          subjectCount: 0,
        }));

        cy.intercept("GET", "**/shelves*", {
          statusCode: 200,
          body: { isSuccess: true, data: shelves, message: "ok" },
        }).as("manyShelves");

        cy.reload();
        cy.wait("@manyShelves");
        cy.get('[data-testid="shelf-item"]').should("have.length.at.least", 10);
      });

      it("renders a question list with 100+ questions without exceeding timeout", () => {
        const questions = Array.from({ length: 100 }, (_, i) => ({
          id: `q-${i}`,
          testSuiteId: "ts-1",
          content: `Question ${i + 1}?`,
          type: "SINGLE_CHOICE",
          options: ["A", "B", "C", "D"],
          correctOptionIndices: [0],
        }));

        cy.intercept("GET", "**/questions*", {
          statusCode: 200,
          body: { isSuccess: true, data: questions, message: "ok" },
        }).as("manyQuestions");

        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="test-suite-item"]').first().click();
        cy.wait("@manyQuestions");
        cy.get('[data-testid="question-item"]').should(
          "have.length.at.least",
          10,
        );
      });
    });
  });
});
