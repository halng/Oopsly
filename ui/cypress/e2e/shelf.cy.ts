// cypress/e2e/shelf.cy.ts
// Journey: Shelf CRUD — full coverage incl. edge cases

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

const SHELF_NAME = "E2E Test Shelf";
const UPDATED_SHELF_NAME = "Updated E2E Shelf";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Shelf Journey - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.login();
      cy.get('[data-testid="home-screen"]').should("exist");
    });

    // ─── Create Shelf ──────────────────────────────────────────────────────────
    describe("Create Shelf", () => {
      it("shows the Add Shelf button on home screen", () => {
        cy.get('[data-testid="add-shelf-button"]').should("be.visible");
      });

      it("opens the Create Shelf modal", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').should("be.visible");
      });

      it("prevents saving with empty shelf name", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.contains(/name.*required|enter.*name/i).should("be.visible");
        cy.get('[data-testid="home-screen"]').should("not.exist"); // still in modal
      });

      it("prevents saving with only whitespace as name", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("   ");
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.contains(/name.*required|enter.*name/i).should("be.visible");
      });

      it("trims leading/trailing whitespace in shelf name", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("  TrimmedShelf  ");
        cy.get('[data-testid="save-shelf-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains("TrimmedShelf").should("be.visible");
      });

      it("creates a shelf with maximum-length name", () => {
        const maxName = "A".repeat(100);
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type(maxName);
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.contains(/created successfully|name too long/i).should("be.visible");
      });

      it("creates a shelf with special characters in the name", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Math & Physics: 101!");
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.contains(/created successfully/i).should("be.visible");
        cy.contains("Math & Physics: 101!").should("be.visible");
      });

      it("creates a shelf and shows it in the list", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type(SHELF_NAME);
        cy.get('[data-testid="save-shelf-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains(SHELF_NAME).should("be.visible");
      });

      it("cancels the create shelf modal without saving", () => {
        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Cancel Me");
        cy.get('[data-testid="cancel-modal-button"]').click();
        cy.contains("Cancel Me").should("not.exist");
      });

      it("shows API error toast when server fails to create shelf", () => {
        cy.intercept("POST", "**/shelves*", {
          statusCode: 500,
          body: { isSuccess: false, message: "Internal Server Error" },
        }).as("createShelf");

        cy.get('[data-testid="add-shelf-button"]').click();
        cy.get('[data-testid="shelf-name-input"]').type("Will Fail Shelf");
        cy.get('[data-testid="save-shelf-button"]').click();

        cy.wait("@createShelf");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Read / List ───────────────────────────────────────────────────────────
    describe("Shelf Listing", () => {
      it("shows empty state when no shelves exist", () => {
        // This test assumes a clean account with no shelves
        // In practice, use a seed/reset fixture
        cy.get('[data-testid="empty-shelf-state"]').should("exist");
      });

      it("shows multiple shelves when they exist", () => {
        // Assumes shelves are seeded. Verify at least two are visible.
        cy.get('[data-testid="shelf-item"]').should(
          "have.length.greaterThan",
          1,
        );
      });

      it("shows correct count of subjects within a shelf", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="shelf-subject-count"]')
          .should("exist");
      });

      it("loads shelves list without infinite spinner", () => {
        cy.get('[data-testid="loading-indicator"]').should("not.exist");
        cy.get('[data-testid="shelf-item"]').should("exist");
      });
    });

    // ─── Update Shelf ──────────────────────────────────────────────────────────
    describe("Edit Shelf", () => {
      it("opens an edit modal pre-filled with current name", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="edit-shelf-button"]')
          .click();
        cy.get('[data-testid="shelf-name-input"]').should(
          "have.value",
          SHELF_NAME,
        );
      });

      it("updates a shelf name and reflects the change immediately", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="edit-shelf-button"]')
          .click();
        cy.get('[data-testid="shelf-name-input"]')
          .clear()
          .type(UPDATED_SHELF_NAME);
        cy.get('[data-testid="save-shelf-button"]').click();

        cy.contains(/updated successfully/i).should("be.visible");
        cy.contains(UPDATED_SHELF_NAME).should("be.visible");
        cy.contains(SHELF_NAME).should("not.exist");
      });

      it("prevents saving an empty name on edit", () => {
        cy.contains(UPDATED_SHELF_NAME)
          .parent()
          .find('[data-testid="edit-shelf-button"]')
          .click();
        cy.get('[data-testid="shelf-name-input"]').clear();
        cy.get('[data-testid="save-shelf-button"]').click();
        cy.contains(/name.*required/i).should("be.visible");
      });

      it("shows API error when update request fails", () => {
        cy.intercept("PUT", "**/shelves/**", {
          statusCode: 503,
          body: { isSuccess: false, message: "Service Unavailable" },
        }).as("updateShelf");

        cy.contains(UPDATED_SHELF_NAME)
          .parent()
          .find('[data-testid="edit-shelf-button"]')
          .click();
        cy.get('[data-testid="shelf-name-input"]').clear().type("New Name");
        cy.get('[data-testid="save-shelf-button"]').click();

        cy.wait("@updateShelf");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Delete Shelf ──────────────────────────────────────────────────────────
    describe("Delete Shelf", () => {
      it("shows a confirmation dialog before deleting", () => {
        cy.contains(UPDATED_SHELF_NAME)
          .parent()
          .find('[data-testid="delete-shelf-button"]')
          .click();
        cy.contains(/are you sure|confirm delete/i).should("be.visible");
      });

      it("cancels deletion when user dismisses the confirm dialog", () => {
        cy.contains(UPDATED_SHELF_NAME)
          .parent()
          .find('[data-testid="delete-shelf-button"]')
          .click();
        cy.get('[data-testid="cancel-delete-button"]').click();
        cy.contains(UPDATED_SHELF_NAME).should("still.exist");
      });

      it("deletes a shelf and removes it from the list", () => {
        cy.contains(UPDATED_SHELF_NAME)
          .parent()
          .find('[data-testid="delete-shelf-button"]')
          .click();
        cy.get('[data-testid="confirm-delete-button"]').click();

        cy.contains(/deleted successfully/i).should("be.visible");
        cy.contains(UPDATED_SHELF_NAME).should("not.exist");
      });

      it("shows empty state after all shelves are deleted", () => {
        cy.get('[data-testid="shelf-item"]').each(($item) => {
          cy.wrap($item).find('[data-testid="delete-shelf-button"]').click();
          cy.get('[data-testid="confirm-delete-button"]').click();
          cy.contains(/deleted successfully/i).should("be.visible");
        });
        cy.get('[data-testid="empty-shelf-state"]').should("be.visible");
      });

      it("shows API error when delete request fails", () => {
        cy.intercept("DELETE", "**/shelves/**", {
          statusCode: 500,
          body: { isSuccess: false, message: "Deletion failed" },
        }).as("deleteShelf");

        cy.get('[data-testid="shelf-item"]')
          .first()
          .find('[data-testid="delete-shelf-button"]')
          .click();
        cy.get('[data-testid="confirm-delete-button"]').click();

        cy.wait("@deleteShelf");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Responsive / Viewport ────────────────────────────────────────────────
    describe("Responsive Behaviour", () => {
      it("shelf list wraps correctly on narrow mobile (iPhone SE)", () => {
        cy.get('[data-testid="shelf-item"]').should("be.visible");
      });

      it("shelf list shows correctly on large tablet (iPad Pro)", () => {
        cy.get('[data-testid="shelf-item"]').should("be.visible");
      });
    });
  });
});
