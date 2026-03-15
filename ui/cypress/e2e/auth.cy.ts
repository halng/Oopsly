// cypress/e2e/auth.cy.ts
// Journey: Onboarding & Login — full coverage incl. edge cases

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

const VALID_EMAIL = "test@example.com";
const INVALID_EMAILS = ["notanemail", "missing@", "@nodomain.com", "   "];
const VALID_OTP = ["1", "2", "3", "4", "5", "6"];

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Auth Journey - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.visit("/");
      cy.get('[data-testid="skip-button"]')
        .should("exist")
        .contains("Skip")
        .and("be.visible")
        .click();
      cy.location("pathname").should("eq", "/onboard");
    });
    describe("Email Entry", () => {
      beforeEach(() => {
        cy.get('[data-testid="email-input-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/onboard");
      });

      it("shows back button and able to back to landing page", () => {
        cy.get('[data-testid="header-container"]')
          .should("exist")
          .and("be.visible")
          .find('[data-testid="back-button"]')
          .should("exist")
          .and("be.visible")
          .click();
        cy.location("pathname").should("eq", "/");
      });

      it("shows email input field on onboard screen", () => {
        cy.get('[data-testid="email-input-container"]')
          .should("exist")
          .and("be.visible");
        cy.get('[data-testid="title-text"]')
          .should("exist")
          .and("be.visible")
          .and("contain", "What's your email?");
        cy.get('[data-testid="description-text"]')
          .should("exist")
          .and("be.visible")
          .and(
            "contain",
            "We'll send you a secure code to verify your account.",
          );
        cy.get('[data-testid="email-input"]')
          .should("exist")
          .and("be.visible")
          .and("have.attr", "placeholder", "name@example.com");
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").contains("Continue");
      });

      it("disable button when email is invalid", () => {
        INVALID_EMAILS.forEach(email => {
          cy.get('[data-testid="email-input"]').should("exist").and("be.visible").type(email);
          cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").and("have.attr", "aria-disabled", "true");
          cy.get('[data-testid="email-input"]').clear();
        })
      });

      it("accepts valid email and shows OTP screen", () => {
        cy.get('[data-testid="email-input"]').should("exist").and("be.visible").type(VALID_EMAIL);
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="otp-input-0"]').should("exist").and("be.visible");
      });

      it("allows editing the email to correct it before sending OTP", () => {
        cy.get('[data-testid="email-input"]').should("exist").and("be.visible").type("bademail");
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").click();
        cy.contains(/valid email/i).should("exist").and("be.visible");

        cy.get('[data-testid="email-input"]').clear().type(VALID_EMAIL);
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="otp-input-0"]').should("exist").and("be.visible");
      });
    });

    // ─── OTP Verification ─────────────────────────────────────────────────────
    describe("OTP Verification", () => {
      beforeEach(() => {
        cy.get('[data-testid="email-input"]').should("exist").and("be.visible").type(VALID_EMAIL);
        cy.get('[data-testid="continue-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="otp-input-0"]').should("exist").and("be.visible");
      });

      it("shows 6 OTP input boxes", () => {
        for (let i = 0; i < 6; i++) {
          cy.get(`[data-testid="otp-input-${i}"]`).should("exist").and("be.visible");
        }
      });

      it("rejects empty OTP submission", () => {
        cy.get('[data-testid="verify-otp-button"]').should("exist").and("be.visible").click();
        cy.contains(/enter.*code|code.*required|invalid/i).should("exist").and("be.visible");
      });

      it("rejects partial OTP (fewer than 6 digits)", () => {
        cy.get('[data-testid="otp-input-0"]').type("1");
        cy.get('[data-testid="otp-input-1"]').type("2");
        cy.get('[data-testid="verify-otp-button"]').click();
        cy.contains(/incomplete|invalid|enter.*code/i).should("be.visible");
      });

      it("rejects incorrect OTP", () => {
        // Type a wrong OTP
        ["9", "9", "9", "9", "9", "9"].forEach((digit, i) => {
          cy.get(`[data-testid="otp-input-${i}"]`).type(digit);
        });
        cy.get('[data-testid="verify-otp-button"]').click();
        cy.contains(/invalid|expired|incorrect/i).should("be.visible");
      });

      it("accepts correct OTP and redirects to home", () => {
        cy.login(VALID_EMAIL);
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });

      it("allows resending the OTP", () => {
        cy.get('[data-testid="recontinue-button"]').should("exist").click();
        cy.contains(/resent|sent again|check your email/i).should("be.visible");
      });

      it("auto-advances focus through OTP digit fields", () => {
        cy.get('[data-testid="otp-input-0"]').type("1");
        cy.focused().should("have.attr", "data-testid", "otp-input-1");
      });
    });

    // ─── Session & Navigation ──────────────────────────────────────────────────
    describe("Session Persistence", () => {
      it("redirects authenticated users away from the login page", () => {
        cy.login(VALID_EMAIL);
        cy.visit("/");
        // Authenticated user should be redirected to home, not see the landing page
        cy.get('[data-testid="home-screen"]').should("exist").and("be.visible");
        cy.location("pathname").should("eq", "/home");
      });

      it("redirects unauthenticated user away from protected home screen", () => {
        cy.visit("/home");
        // Should be redirected to landing / onboard
        cy.get('[data-testid="get-started-button"]').should("exist").and("be.visible");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });

      it("logs out and clears session", () => {
        cy.login(VALID_EMAIL);
        cy.get('[data-testid="profile-icon"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="logout-button"]').should("exist").and("be.visible").click();
        cy.get('[data-testid="get-started-button"]').should("exist").and("be.visible");
        cy.location("pathname").should("match", /^\/(|onboard)$/);
      });
    });

    // ─── API Error Handling ────────────────────────────────────────────────────
    describe("API Error States", () => {
      it("shows error message when OTP send request fails (network error)", () => {
        cy.intercept("POST", "**/auth/otp*", { forceNetworkError: true }).as(
          "otpRequest",
        );

        cy.get('[data-testid="get-started-button"]').click();
        cy.get('[data-testid="email-input"]').type(VALID_EMAIL);
        cy.get('[data-testid="continue-button"]').click();

        cy.contains(/something went wrong|network error|failed/i).should(
          "be.visible",
        );
      });

      it("shows error when OTP verification fails on server", () => {
        cy.get('[data-testid="get-started-button"]').click();
        cy.get('[data-testid="email-input"]').type(VALID_EMAIL);
        cy.get('[data-testid="continue-button"]').click();
        cy.get('[data-testid="otp-input-0"]').should("be.visible");

        cy.intercept("POST", "**/auth/verify*", {
          statusCode: 401,
          body: { isSuccess: false, message: "Invalid OTP" },
        }).as("verifyOtp");

        VALID_OTP.forEach((digit, i) => {
          cy.get(`[data-testid="otp-input-${i}"]`).type(digit);
        });
        cy.get('[data-testid="verify-otp-button"]').click();

        cy.wait("@verifyOtp");
        cy.contains(/invalid|expired|incorrect/i).should("be.visible");
      });
    });
  });
});
