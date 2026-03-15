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
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "next-button")
        .and("not.have.attr", "disabled")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Learn Smarter");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains(
          "Use AI-powered flashcards and spaced repetition to maximize retention",
        );
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "next-button")
        .and("not.have.attr", "disabled")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Track Progress");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains(
          "Monitor your learning journey with detailed analytics and insights",
        );
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "next-button")
        .and("not.have.attr", "disabled")
        .contains("Get Started")
        .click();

      cy.location("pathname").should("eq", "/onboard");
    });

    it("handle skip button on landing page", () => {
      cy.get('[data-testid="skip-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "skip-button")
        .and("not.have.attr", "disabled")
        .contains("Skip")
        .click();
      cy.location("pathname").should("eq", "/onboard");
    });

    it("handle back button on landing page", () => {
      cy.get('[data-testid="back-button"]').should("not.exist");

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="next-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "next-button")
        .and("not.have.attr", "disabled")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Learn Smarter");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains(
          "Use AI-powered flashcards and spaced repetition to maximize retention",
        );
      cy.get('[data-testid="back-button"]')
        .should("exist")
        .and("be.visible")
        .should("be.enabled")
        .should("have.attr", "data-testid", "back-button")
        .and("not.have.attr", "disabled")
        .click();

      cy.get('[data-testid="content-view-title"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-title")
        .contains("Welcome to Oopsly");
      cy.get('[data-testid="content-view-subtitle"]')
        .should("exist")
        .and("be.visible")
        .should("have.attr", "data-testid", "content-view-subtitle")
        .contains("The smart way to study and retain information efficiently");
      cy.get('[data-testid="back-button"]')
        .should("exist")
        .and("not.be.visible")
        .should("have.attr", "data-testid", "back-button");
    });
  });
});
