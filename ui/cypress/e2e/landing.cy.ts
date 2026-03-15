import { FLATTEN_VIEW_PORTS } from "../support/viewports";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Landing Page - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.visit("/");
    });
    it("loads the index/landing page correctly", () => {
      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Learn Smarter");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains(
          "Use AI-powered flashcards and spaced repetition to maximize retention",
        );
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Track Progress");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains(
          "Monitor your learning journey with detailed analytics and insights",
        );
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .contains("Get Started")
        .click();

      cy.location("pathname").should("eq", "/onboard");
    });

    it("handle skip button on landing page", () => {
      cy.get('[data-testid="skip-button"]')
        .should("exist")
        .contains("Skip")
        .and("be.visible")
        .click();
      cy.location("pathname").should("eq", "/onboard");
    });

    it("handle back button on landing page", () => {
      cy.get('[data-testid="back-button"]').should("not.exist");

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Learn Smarter");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains(
          "Use AI-powered flashcards and spaced repetition to maximize retention",
        );
      cy.get('[data-testid="back-button"]')
        .should("exist")
        .and("be.visible")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="back-button"]')
        .should("exist")
        .and("not.be.visible");
    });
  });
});
