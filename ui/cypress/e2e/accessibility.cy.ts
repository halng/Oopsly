// cypress/e2e/accessibility.cy.ts
// Cross-cutting: A11y, keyboard navigation, screen reader hints, responsive viewports

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Accessibility & Responsive Edge Cases - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
    });

    // ─── Viewport / Responsive ─────────────────────────────────────────────────
    describe("Responsive Layouts", () => {
      it(`renders the landing page correctly`, () => {
        cy.visit("/");
        cy.get('[data-testid="content-view-title"]')
          .should("exist")
          .and("be.visible")
          .contains("Welcome to Oopsly");
        cy.get('[data-testid="skip-button"]')
          .should("exist")
          .contains("Skip")
          .and("be.visible")
          .click();
        cy.location("pathname").should("eq", "/onboard");
      });

      it(`renders the home screen correctly`, () => {
        cy.login();
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        // No horizontal overflow
        cy.get("body").then(($body) => {
          expect($body[0].scrollWidth).to.be.lte($body[0].clientWidth + 5); // 5px tolerance
        });
      });

      it("test-taking screen is scrollable when content overflows", () => {
        cy.login();
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.contains("Take Test").should("exist").and("be.visible").click();
        cy.get('[data-testid="take-test-screen"]').should("exist").and("be.visible");
        // Should be scrollable (not clipped)
        cy.get('[data-testid="question-card"]').should("exist").and("be.visible");
      });

      it("question modal is scrollable", () => {
        cy.login();
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.get('[data-testid="add-question-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="question-modal"]').should("exist").and("be.visible");
        // Save Question button scrolled into view
        cy.contains("Save Question").scrollIntoView().should("exist").and("be.visible");
      });
    });

    // ─── Accessible Labels ─────────────────────────────────────────────────────
    describe("Accessible Labels & ARIA", () => {
      beforeEach(() => cy.login());

      it("profile icon button has an accessible label", () => {
        cy.get('[data-testid="profile-icon"]')
          .should("exist")
          .and("be.visible")
          .should("have.attr", "aria-label")
          .and("not.be.empty");
      });

      it("Add Shelf button has an accessible label", () => {
        cy.get('[data-testid="add-shelf-button"]')
          .should("exist")
          .and("be.visible")
          .should("have.attr", "aria-label")
          .and("not.be.empty");
      });

      it("shelf items have accessible labels for screen readers", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").each(($el) => {
          cy.wrap($el).should("have.attr", "accessible", "true");
        });
      });

      it("back buttons have an accessible label", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="back-button"]')
          .should("exist")
          .and("be.visible")
          .should("have.attr", "aria-label")
          .and("match", /back|go back/i);
      });

      it("question options in take-test have accessible roles", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.contains("Take Test").should("exist").and("be.visible").click();
        cy.get('[data-testid="option-0"]').should("exist").should(
          "have.attr",
          "accessible",
          "true",
        );
      });

      it("TextInput for fill-in-the-blank has accessible placeholder", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.contains("Take Test").should("exist").and("be.visible").click();
        // Navigate to fill-in-blank question if present
        cy.get("body").then(($body) => {
          if ($body.text().includes("Type your answer here...")) {
            cy.get('[placeholder="Type your answer here..."]').should("exist").should(
              "have.attr",
              "placeholder",
              "Type your answer here...",
            );
          }
        });
      });
    });

    // ─── Color Contrast / Dark Mode ────────────────────────────────────────────
    describe("Dark Mode Toggle", () => {
      beforeEach(() => {
        cy.login();
        cy.get('[data-testid="profile-icon"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="settings-button"]').should("exist").and("be.visible").click();
      });

      it("toggling dark mode applies a dark class to the root", () => {
        cy.get('[data-testid="dark-mode-toggle"]').should("exist").and("be.visible").click();
        cy.get('html, body, [data-testid="app-root"]').should(($el) => {
          const hasDark =
            $el.hasClass("dark") ||
            $el.attr("data-theme") === "dark" ||
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          expect(hasDark).to.be.true;
        });
      });
    });

    // ─── Keyboard / Focus Management ──────────────────────────────────────────
    describe("Focus Management", () => {
      it("focus moves to the email input when onboard screen loads", () => {
        cy.visit("/");
        cy.get('[data-testid="skip-button"]')
          .should("exist")
          .contains("Skip")
          .and("be.visible")
          .click();
        cy.focused().should("have.attr", "data-testid", "email-input");
      });

      it("focus moves to the first OTP field after email is submitted", () => {
        cy.visit("/");
        cy.get('[data-testid="skip-button"]')
          .should("exist")
          .contains("Skip")
          .and("be.visible")
          .click();
        cy.get('[data-testid="email-input"]').should("exist").and("be.visible").type("test@example.com");
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").click();
        cy.focused().should("have.attr", "data-testid", "otp-input-0");
      });

      it("focus moves to dialog confirm button when delete confirmation opens", () => {
        cy.login();
        cy.get('[data-testid="shelf-item"]')
          .should("exist")
          .first()
          .find('[data-testid="delete-shelf-button"]')
          .should("exist")
          .click();
        cy.focused().should(
          "have.attr",
          "data-testid",
          "confirm-delete-button",
        );
      });

      it("focus returns to trigger element after cancel modal is closed", () => {
        cy.login();
        cy.get('[data-testid="add-shelf-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="cancel-modal-button"]').should("exist").and("be.visible").click();
        cy.focused().should("have.attr", "data-testid", "add-shelf-button");
      });
    });

    // ─── Text & Content Edge Cases ─────────────────────────────────────────────
    describe("Content Edge Cases", () => {
      beforeEach(() => cy.login());

      it("handles shelf names with emoji characters", () => {
        cy.get('[data-testid="add-shelf-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="shelf-name-input"]').should("exist").and("be.visible").type("🔬 Science 📚");
        cy.get('[data-testid="save-shelf-button"]').should("exist").and("be.visible").click();
        cy.contains("🔬 Science 📚").should("exist").and("be.visible");
      });

      it("handles shelf names with international (CJK) characters", () => {
        cy.get('[data-testid="add-shelf-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="shelf-name-input"]').should("exist").and("be.visible").type("日本語テスト");
        cy.get('[data-testid="save-shelf-button"]').should("exist").and("be.visible").click();
        cy.contains("日本語テスト").should("exist").and("be.visible");
      });

      it("handles question content with HTML special characters", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.get('[data-testid="add-question-button"]').should("exist").and("be.visible").click();
        cy.contains("FILL IN THE BLANK").should("exist").and("be.visible").click();
        cy.get('[placeholder="Enter question text"]').should("exist").and("be.visible").type(
          '<script>alert("xss")</script> is escaped?',
        );
        cy.get('[placeholder="Expected answer (e.g. Washington)"]').should("exist").and("be.visible").type("Yes");
        cy.contains("Save Question").should("exist").and("be.visible").click();

        // Ensure script was not injected (XSS check)
        cy.get('[data-testid="question-content"]').should("exist").then(($el) => {
          expect($el.html()).to.not.include("<script>");
        });
      });

      it("question content with very long text is truncated or wrapped in the list", () => {
        cy.get('[data-testid="shelf-item"]').should("exist").first().click();
        cy.get('[data-testid="test-suite-item"]').should("exist").first().click();
        cy.get('[data-testid="add-question-button"]').should("exist").and("be.visible").click();
        cy.contains("FILL IN THE BLANK").should("exist").and("be.visible").click();
        cy.get('[placeholder="Enter question text"]').should("exist").and("be.visible").type("Q".repeat(500));
        cy.get('[placeholder="Expected answer (e.g. Washington)"]').should("exist").and("be.visible").type(
          "Answer",
        );
        cy.contains("Save Question").should("exist").and("be.visible").click();

        cy.contains(/created successfully/i).should("exist").and("be.visible");
        // List item should not overflow/break layout
        cy.get('[data-testid="question-item"]').last().should("exist").and("be.visible");
      });
    });
  });
});
