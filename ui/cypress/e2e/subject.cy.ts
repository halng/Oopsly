// cypress/e2e/subject.cy.ts
// Journey: Subject & Card Management + Study Session — full coverage incl. edge cases

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

const SHELF_NAME = "E2E Test Shelf";
const SUBJECT_NAME = "Anatomy";
const CARD_FRONT = "What is the longest bone in the body?";
const CARD_BACK = "The femur.";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Subject & Card Journey - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.login();
      cy.get('[data-testid="home-screen"]').should("exist");
    });

    // ─── Navigate to Subject List ──────────────────────────────────────────────
    describe("Shelf Navigation", () => {
      it("navigates into a shelf and shows the subject list", () => {
        cy.contains(SHELF_NAME).should("exist").and("be.visible").click();
        cy.get('[data-testid="subject-list"]').should("exist").and("be.visible");
      });

      it("shows empty state when a shelf has no subjects", () => {
        cy.contains(SHELF_NAME).should("exist").and("be.visible").click();
        cy.get('[data-testid="empty-subject-state"]').should("exist").and("be.visible");
      });

      it("navigates back to home from a shelf", () => {
        cy.contains(SHELF_NAME).should("exist").and("be.visible").click();
        cy.get('[data-testid="back-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });
    });

    // ─── Create Subject ────────────────────────────────────────────────────────
    describe("Create Subject", () => {
      beforeEach(() => {
        cy.contains(SHELF_NAME).should("exist").and("be.visible").click();
      });

      it("opens the Add Subject modal", () => {
        cy.get('[data-testid="add-subject-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="subject-name-input"]').should("exist").and("be.visible");
      });

      it("prevents saving with an empty name", () => {
        cy.get('[data-testid="add-subject-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="save-subject-button"]').should("exist").and("be.visible").click();
        cy.contains(/name.*required|enter.*name/i).should("exist").and("be.visible");
      });

      it("prevents saving with whitespace-only name", () => {
        cy.get('[data-testid="add-subject-button"]').click();
        cy.get('[data-testid="subject-name-input"]').type("    ");
        cy.get('[data-testid="save-subject-button"]').click();
        cy.contains(/name.*required|enter.*name/i).should("be.visible");
      });

      it("creates a subject and shows it in the list", () => {
        cy.get('[data-testid="add-subject-button"]').click();
        cy.get('[data-testid="subject-name-input"]').type(SUBJECT_NAME);
        cy.get('[data-testid="save-subject-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains(SUBJECT_NAME).should("be.visible");
      });

      it("creates a subject with a description", () => {
        cy.get('[data-testid="add-subject-button"]').click();
        cy.get('[data-testid="subject-name-input"]').type("Biology");
        cy.get('[data-testid="subject-description-input"]').type(
          "Study of living organisms",
        );
        cy.get('[data-testid="save-subject-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
      });

      it("cancels creates without saving", () => {
        cy.get('[data-testid="add-subject-button"]').click();
        cy.get('[data-testid="subject-name-input"]').type("Cancel Subject");
        cy.get('[data-testid="cancel-modal-button"]').click();
        cy.contains("Cancel Subject").should("not.exist");
      });

      it("shows API error when subject creation fails", () => {
        cy.intercept("POST", "**/subjects*", {
          statusCode: 500,
          body: { isSuccess: false, message: "Creation failed" },
        }).as("createSubject");

        cy.get('[data-testid="add-subject-button"]').click();
        cy.get('[data-testid="subject-name-input"]').type("Failing Subject");
        cy.get('[data-testid="save-subject-button"]').click();

        cy.wait("@createSubject");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Card CRUD ─────────────────────────────────────────────────────────────
    describe("Card Management", () => {
      beforeEach(() => {
        cy.contains(SHELF_NAME).click();
        cy.contains(SUBJECT_NAME).click();
        cy.get('[data-testid="subject-detail-screen"]').should("exist");
      });

      it("shows empty state when no cards exist", () => {
        cy.get('[data-testid="empty-card-state"]').should("be.visible");
      });

      it("opens the add card modal", () => {
        cy.get('[data-testid="add-card-button"]').click();
        cy.get('[data-testid="card-front-input"]').should("be.visible");
        cy.get('[data-testid="card-back-input"]').should("be.visible");
      });

      it("prevents saving a card with empty front", () => {
        cy.get('[data-testid="add-card-button"]').click();
        cy.get('[data-testid="card-back-input"]').type("Some answer");
        cy.get('[data-testid="save-card-button"]').click();
        cy.contains(/front.*required|enter.*front/i).should("be.visible");
      });

      it("prevents saving a card with empty back", () => {
        cy.get('[data-testid="add-card-button"]').click();
        cy.get('[data-testid="card-front-input"]').type("Some question");
        cy.get('[data-testid="save-card-button"]').click();
        cy.contains(/back.*required|enter.*back/i).should("be.visible");
      });

      it("creates a card and shows it in the list", () => {
        cy.get('[data-testid="add-card-button"]').click();
        cy.get('[data-testid="card-front-input"]').type(CARD_FRONT);
        cy.get('[data-testid="card-back-input"]').type(CARD_BACK);
        cy.get('[data-testid="save-card-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains(CARD_FRONT).should("be.visible");
      });

      it("creates multiple cards in a batch", () => {
        const batch = [
          { front: "Q1?", back: "A1" },
          { front: "Q2?", back: "A2" },
          { front: "Q3?", back: "A3" },
        ];
        batch.forEach((card) => {
          cy.get('[data-testid="add-card-button"]').click();
          cy.get('[data-testid="card-front-input"]').type(card.front);
          cy.get('[data-testid="card-back-input"]').type(card.back);
          cy.get('[data-testid="save-card-button"]').click();
          cy.contains(/created successfully/i).should("be.visible");
        });
        cy.get('[data-testid="card-item"]').should("have.length.at.least", 3);
      });

      it("edits a card front and back, saves, and reflects changes", () => {
        cy.contains(CARD_FRONT)
          .parent()
          .find('[data-testid="edit-card-button"]')
          .click();
        cy.get('[data-testid="card-front-input"]')
          .clear()
          .type("Updated Front?");
        cy.get('[data-testid="card-back-input"]')
          .clear()
          .type("Updated Answer.");
        cy.get('[data-testid="save-card-button"]').click();

        cy.contains(/updated successfully/i).should("be.visible");
        cy.contains("Updated Front?").should("be.visible");
        cy.contains(CARD_FRONT).should("not.exist");
      });

      it("cancels edit without persisting changes", () => {
        cy.get('[data-testid="card-item"]')
          .first()
          .find('[data-testid="edit-card-button"]')
          .click();
        cy.get('[data-testid="card-front-input"]')
          .clear()
          .type("Will Not Save");
        cy.get('[data-testid="cancel-modal-button"]').click();
        cy.contains("Will Not Save").should("not.exist");
      });

      it("shows confirmation before deleting a card", () => {
        cy.get('[data-testid="card-item"]')
          .first()
          .find('[data-testid="delete-card-button"]')
          .click();
        cy.contains(/are you sure|confirm/i).should("be.visible");
      });

      it("deletes a card after confirming", () => {
        cy.get('[data-testid="card-item"]')
          .first()
          .then(($card) => {
            const frontText = $card
              .find('[data-testid="card-front-text"]')
              .text();
            cy.wrap($card).find('[data-testid="delete-card-button"]').click();
            cy.get('[data-testid="confirm-delete-button"]').click();

            cy.contains(/deleted successfully/i).should("be.visible");
            cy.contains(frontText).should("not.exist");
          });
      });

      it("cancels deletion and card remains in list", () => {
        cy.get('[data-testid="card-item"]')
          .first()
          .find('[data-testid="delete-card-button"]')
          .click();
        cy.get('[data-testid="cancel-delete-button"]').click();
        cy.get('[data-testid="card-item"]').should("have.length.at.least", 1);
      });

      it("shows API error when card creation fails", () => {
        cy.intercept("POST", "**/cards*", {
          statusCode: 422,
          body: { isSuccess: false, message: "Validation failed" },
        }).as("createCard");

        cy.get('[data-testid="add-card-button"]').click();
        cy.get('[data-testid="card-front-input"]').type("Fail Front");
        cy.get('[data-testid="card-back-input"]').type("Fail Back");
        cy.get('[data-testid="save-card-button"]').click();

        cy.wait("@createCard");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Study Session ─────────────────────────────────────────────────────────
    describe("Study Session", () => {
      beforeEach(() => {
        cy.contains(SHELF_NAME).click();
        cy.contains(SUBJECT_NAME).click();
      });

      it("disables study button when no cards exist", () => {
        cy.get('[data-testid="start-study-button"]').should("be.disabled");
      });

      it("starts a study session when cards exist", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="flashcard"]').should("be.visible");
      });

      it("flips the card to reveal the back side", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="flashcard"]').click();
        cy.get('[data-testid="card-back"]').should("be.visible");
      });

      it("allows difficulty rating: EASY", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="difficulty-easy-button"]').click();
        // Next card or session complete
        cy.get(
          '[data-testid="flashcard"], [data-testid="study-complete"]',
        ).should("exist");
      });

      it("allows difficulty rating: HARD", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="difficulty-hard-button"]').click();
        cy.get(
          '[data-testid="flashcard"], [data-testid="study-complete"]',
        ).should("exist");
      });

      it("allows difficulty rating: GOOD", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="difficulty-good-button"]').click();
        cy.get(
          '[data-testid="flashcard"], [data-testid="study-complete"]',
        ).should("exist");
      });

      it("allows difficulty rating: AGAIN", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="difficulty-again-button"]').click();
        cy.get(
          '[data-testid="flashcard"], [data-testid="study-complete"]',
        ).should("exist");
      });

      it("shows a completion screen after all cards are reviewed", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="card-item"]').each(() => {
          cy.get('[data-testid="difficulty-easy-button"]').click();
        });
        cy.get('[data-testid="study-complete"]').should("be.visible");
      });

      it("exits study session and returns to subject detail", () => {
        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="exit-study-button"]').click();
        cy.get('[data-testid="subject-detail-screen"]').should("exist");
      });

      it("shows error toast when review sync fails", () => {
        cy.intercept("PATCH", "**/cards/review*", {
          statusCode: 503,
          body: { isSuccess: false, message: "Sync failed" },
        }).as("syncReview");

        cy.get('[data-testid="start-study-button"]').click();
        cy.get('[data-testid="difficulty-easy-button"]').click();
        cy.wait("@syncReview");
        cy.contains(/failed to sync|error/i).should("be.visible");
      });
    });

    // ─── Subject Edit & Delete ─────────────────────────────────────────────────
    describe("Subject Management", () => {
      beforeEach(() => {
        cy.contains(SHELF_NAME).click();
      });

      it("edits a subject name", () => {
        cy.contains(SUBJECT_NAME)
          .parent()
          .find('[data-testid="edit-subject-button"]')
          .click();
        cy.get('[data-testid="subject-name-input"]')
          .clear()
          .type("Updated Anatomy");
        cy.get('[data-testid="save-subject-button"]').click();

        cy.contains(/updated successfully/i).should("be.visible");
        cy.contains("Updated Anatomy").should("be.visible");
      });

      it("deletes a subject after confirmation", () => {
        cy.contains("Updated Anatomy")
          .parent()
          .find('[data-testid="delete-subject-button"]')
          .click();
        cy.get('[data-testid="confirm-delete-button"]').click();
        cy.contains(/deleted successfully/i).should("be.visible");
        cy.contains("Updated Anatomy").should("not.exist");
      });
    });
  });
});
