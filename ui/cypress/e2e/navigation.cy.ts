// cypress/e2e/navigation.cy.ts
// Cross-cutting: Navigation edge cases, deep linking, back button, route guards

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Navigation Edge Cases - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
    });

    // ─── Route Guards ─────────────────────────────────────────────────────────
    describe("Route Guards (Unauthenticated)", () => {
      it("redirects to landing when accessing /home directly without auth", () => {
        cy.visit("/home");
        cy.get('[data-testid="get-started-button"]')
          .should("exist")
          .and("be.visible")
          .should("be.enabled")
          .should("have.attr", "data-testid", "get-started-button")
          .and("not.have.attr", "disabled");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });

      it("redirects to landing when accessing /test-suite/:id directly without auth", () => {
        cy.visit("/test-suite/some-id");
        cy.get('[data-testid="get-started-button"]').should("exist").and("be.visible");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });

      it("redirects to landing when accessing /take-test/:id without auth", () => {
        cy.visit("/take-test/some-id");
        cy.get('[data-testid="get-started-button"]').should("exist").and("be.visible");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });

      it("redirects to landing when accessing /profile without auth", () => {
        cy.visit("/profile");
        cy.get('[data-testid="get-started-button"]').should("exist").and("be.visible");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });
    });

    // ─── Deep Link Navigation ──────────────────────────────────────────────────
    describe("Deep Link Navigation (Authenticated)", () => {
      beforeEach(() => cy.login());

      it("navigates directly to home and shows shelves", () => {
        cy.visit("/home");
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });

      it("shows 404 / not found UI for unknown routes", () => {
        cy.visit("/this-route-does-not-exist", { failOnStatusCode: false });
        cy.contains(/not found|404|page does not exist/i).should("exist").and("be.visible");
      });

      it("navigates to profile directly via URL", () => {
        cy.visit("/profile");
        cy.get('[data-testid="profile-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/profile");
      });
    });

    // ─── Browser Navigation (Back / Forward) ──────────────────────────────────
    describe("Browser Back / Forward", () => {
      beforeEach(() => cy.login());

      it("browser back from shelf detail returns to home", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.go("back");
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });

      it("browser back from test suite detail returns to shelf", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").and("be.visible").first().click();
        cy.go("back");
        cy.get('[data-testid="shelf-detail-screen"]').should("exist").and("be.visible");
      });

      it("browser back from take-test returns to test suite detail", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").and("be.visible").first().click();
        cy.contains("Take Test").should("exist").and("be.visible").click();
        cy.go("back");
        cy.get('[data-testid="test-suite-detail-screen"]').should("exist").and("be.visible");
      });

      it("browser forward works after going back", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.go("back");
        cy.go("forward");
        cy.get('[data-testid="shelf-detail-screen"]').should("exist").and("be.visible");
      });
    });

    // ─── In-App Back Button ────────────────────────────────────────────────────
    describe("In-App Back Button", () => {
      beforeEach(() => cy.login());

      it("back button on shelf detail returns to home", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });

      it("back button on subject detail returns to shelf", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="subject-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="shelf-detail-screen"]').should("exist").and("be.visible");
      });

      it("back button on test suite detail returns to shelf", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="shelf-detail-screen"]').should("exist").and("be.visible");
      });

      it("back button on take-test screen returns to test suite", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").and("be.visible").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").and("be.visible").first().click();
        cy.contains("Take Test").should("exist").and("be.visible").click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="test-suite-detail-screen"]').should("exist").and("be.visible");
      });

      it("back button on profile screen returns to home", () => {
        cy.get('[data-testid="profile-icon"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });
    });

    // ─── Navigation State Preservation ────────────────────────────────────────
    describe("Navigation State Preservation", () => {
      beforeEach(() => cy.login());

      it("scroll position is NOT reset when navigating back to shelf list", () => {
        // Scroll to bottom of long list, navigate away, come back
        cy.get('[data-testid="shelf-item"]').last().scrollIntoView();
        cy.get('[data-testid="shelf-item"]').last().click();
        cy.get('[data-testid="back-button"]').click();
        // The last shelf item should still be visible (scroll preserved)
        cy.get('[data-testid="shelf-item"]').last().should("be.visible");
      });

      it("modal state is reset after navigating away and back", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Partial Save");
        // Navigate away without saving
        cy.get('[data-testid="cancel-modal-button"]').click();
        // No lingering modal
        cy.get('[data-testid="shelf-name-input"]').should("not.exist");
      });

      it("test progress is lost after navigating away mid-test without submitting", () => {
        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="test-suite-item"]').first().click();
        cy.contains("Take Test").click();

        // Answer Q1
        cy.get('[data-testid="option-0"]').click();
        cy.go("back"); // Navigate away
        cy.contains("Take Test").click(); // Re-enter test

        // Should start fresh from Q1 with no answer selected
        cy.contains(/1 \//i).should("be.visible");
        cy.get('[data-testid="option-0"]').should("not.have.class", "selected");
      });
    });

    // ─── Rapid Navigation ─────────────────────────────────────────────────────
    describe("Rapid / Concurrent Navigation", () => {
      beforeEach(() => cy.login());

      it("rapid back-and-forth navigation does not crash the app", () => {
        cy.get('[data-testid="shelf-item"]').first().click();
        cy.go("back");
        cy.get('[data-testid="shelf-item"]').first().click();
        cy.go("back");
        cy.get('[data-testid="shelf-item"]').first().click();
        cy.get('[data-testid="home-screen"]').should("not.exist");
        cy.get('[data-testid="shelf-detail-screen"]').should("exist");
      });
    });

    // ─── 404 / Not Found ──────────────────────────────────────────────────────
    describe("Non-existent IDs", () => {
      beforeEach(() => cy.login());

      it("shows not-found or error UI for non-existent test suite ID", () => {
        cy.intercept("GET", "**/questions*", {
          statusCode: 404,
          body: {
            isSuccess: false,
            data: null,
            message: "Test suite not found",
          },
        }).as("missingQuestions");

        cy.visit("/test-suite/non-existent-id-999");
        cy.wait("@missingQuestions");
        cy.contains(/not found|error|doesn't exist/i).should("be.visible");
      });

      it("shows not-found UI for non-existent take-test route", () => {
        cy.intercept("GET", "**/questions*", {
          statusCode: 404,
          body: { isSuccess: false, data: null, message: "Not found" },
        }).as("missingTest");

        cy.visit("/take-test/non-existent-id-999");
        cy.wait("@missingTest");
        cy.contains(/not found|no questions|doesn't exist/i).should(
          "be.visible",
        );
      });
    });
  });
});
