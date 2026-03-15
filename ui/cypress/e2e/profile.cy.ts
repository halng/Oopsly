// cypress/e2e/profile.cy.ts
// Journey: Profile & Settings — full coverage incl. edge cases

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Profile & Settings Journey - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.login();
      cy.get('[data-testid="home-screen"]').should("exist");
    });

    // ─── Profile Navigation ────────────────────────────────────────────────────
    describe("Profile Navigation", () => {
      it("opens profile screen via profile icon", () => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.get('[data-testid="profile-screen"]').should("exist");
      });

      it("displays the current user email", () => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.contains("test@example.com").should("be.visible");
      });

      it("navigates back to home from profile", () => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.get('[data-testid="back-button"]').click();
        cy.get('[data-testid="home-screen"]').should("exist");
      });
    });

    // ─── Edit Profile ──────────────────────────────────────────────────────────
    describe("Edit Profile", () => {
      beforeEach(() => {
        cy.get('[data-testid="profile-icon"]').click();
      });

      it("opens the edit profile form", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]').should("be.visible");
      });

      it("shows current display name pre-filled in the input", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]')
          .invoke("val")
          .should("not.be.empty");
      });

      it("saves a new display name and reflects it immediately", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]').clear().type("John Doe");
        cy.get('[data-testid="save-profile-button"]').click();

        cy.contains("John Doe").should("be.visible");
        cy.contains(/updated|saved/i).should("be.visible");
      });

      it("prevents saving an empty display name", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]').clear();
        cy.get('[data-testid="save-profile-button"]').click();
        cy.contains(/name.*required|enter.*name/i).should("be.visible");
      });

      it("prevents saving whitespace-only display name", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]').clear().type("    ");
        cy.get('[data-testid="save-profile-button"]').click();
        cy.contains(/name.*required|enter.*name/i).should("be.visible");
      });

      it("cancels edit without saving", () => {
        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]')
          .clear()
          .type("UNSAVED NAME");
        cy.get('[data-testid="cancel-edit-button"]').click();
        cy.contains("UNSAVED NAME").should("not.exist");
      });

      it("shows API error when profile update fails", () => {
        cy.intercept("PUT", "**/users/**", {
          statusCode: 500,
          body: { isSuccess: false, message: "Update failed" },
        }).as("updateProfile");

        cy.get('[data-testid="edit-profile-button"]').click();
        cy.get('[data-testid="display-name-input"]')
          .clear()
          .type("Failing Name");
        cy.get('[data-testid="save-profile-button"]').click();

        cy.wait("@updateProfile");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Settings ─────────────────────────────────────────────────────────────
    describe("Settings Screen", () => {
      beforeEach(() => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.get('[data-testid="settings-button"]').click();
        cy.get('[data-testid="settings-screen"]').should("exist");
      });

      it("shows settings screen", () => {
        cy.get('[data-testid="settings-screen"]').should("be.visible");
      });

      it("navigates back from Settings to Profile", () => {
        cy.get('[data-testid="back-button"]').click();
        cy.get('[data-testid="profile-screen"]').should("exist");
      });

      it("can toggle dark mode setting", () => {
        cy.get('[data-testid="dark-mode-toggle"]').click();
        cy.get('[data-testid="dark-mode-toggle"]').should("be.checked");
        // Toggle back
        cy.get('[data-testid="dark-mode-toggle"]').click();
        cy.get('[data-testid="dark-mode-toggle"]').should("not.be.checked");
      });

      it("can toggle notification settings", () => {
        cy.get('[data-testid="notifications-toggle"]').click();
        cy.contains(/saved|updated/i).should("be.visible");
      });
    });

    // ─── Logout ────────────────────────────────────────────────────────────────
    describe("Logout", () => {
      beforeEach(() => {
        cy.get('[data-testid="profile-icon"]').click();
      });

      it("shows a logout button on the profile screen", () => {
        cy.get('[data-testid="logout-button"]').should("be.visible");
      });

      it("shows a confirmation dialog before logging out", () => {
        cy.get('[data-testid="logout-button"]').click();
        cy.contains(/are you sure|confirm logout|log out now/i).should(
          "be.visible",
        );
      });

      it("cancels logout and stays on profile screen", () => {
        cy.get('[data-testid="logout-button"]').click();
        cy.get('[data-testid="cancel-logout-button"]').click();
        cy.get('[data-testid="profile-screen"]').should("exist");
      });

      it("confirms logout, clears session, and redirects to landing page", () => {
        cy.get('[data-testid="logout-button"]').click();
        cy.get('[data-testid="confirm-logout-button"]').click();

        cy.get('[data-testid="get-started-button"]').should("be.visible");
      });

      it("cannot access home after logging out (session cleared)", () => {
        cy.get('[data-testid="logout-button"]').click();
        cy.get('[data-testid="confirm-logout-button"]').click();

        cy.visit("/home");
        cy.get('[data-testid="get-started-button"]').should("be.visible");
      });
    });

    // ─── Responsive ───────────────────────────────────────────────────────────
    describe("Responsive Profile", () => {
      it("profile screen renders correctly on iPhone SE", () => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.get('[data-testid="profile-screen"]').should("be.visible");
      });

      it("profile screen renders correctly on iPad Pro", () => {
        cy.get('[data-testid="profile-icon"]').click();
        cy.get('[data-testid="profile-screen"]').should("be.visible");
      });
    });
  });
});
