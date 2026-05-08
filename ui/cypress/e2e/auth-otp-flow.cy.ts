describe("OTP authentication flow", () => {
  it("sends OTP and verifies successfully", () => {
    cy.intercept("POST", "**/api/v1/oopsly/otp?email=*", {
      statusCode: 200,
      body: {
        isSuccess: true,
        message: "OTP sent successfully",
        data: null,
        timestamp: new Date().toISOString(),
      },
    }).as("createOtp");
    cy.intercept("POST", "**/api/v1/oopsly/otp/validate", {
      statusCode: 200,
      body: {
        isSuccess: true,
        message: "Authentication successful.",
        data: {
          access_token: "fake-access-token",
          refresh_token: "fake-refresh-token",
          token_type: "Bearer",
        },
        timestamp: new Date().toISOString(),
      },
    }).as("validateOtp");
    cy.intercept("GET", "**/api/v1/oopsly/users/validate", {
      statusCode: 200,
      body: {
        isSuccess: true,
        message: "Valid token",
        data: null,
        timestamp: new Date().toISOString(),
      },
    }).as("validateToken");
    cy.intercept("GET", "**/api/v1/oopsly/user/profile", {
      statusCode: 200,
      body: {
        isSuccess: true,
        message: "Profile retrieved successfully",
        data: {
          displayName: "Cypress User",
          bio: null,
          age: null,
          settings: {
            theme: "SYSTEM",
            language: "en",
            spaceConfig: {
              AGAIN: 1,
              HARD: 10,
              GOOD: 1440,
              EASY: 5760,
            },
          },
        },
        timestamp: new Date().toISOString(),
      },
    }).as("profile");

    cy.visit("/onboard");

    cy.get("[data-testid='email-input']").type("cypress@example.com");
    cy.get("[data-testid='continue-button']").click();
    cy.wait("@createOtp");
    cy.url().should("include", "/verification");

    ["1", "2", "3", "4", "5", "6"].forEach((digit, idx) => {
      cy.get(`[data-testid='otp-input-${idx}']`).type(digit);
    });
    cy.get("[data-testid='verify-button']").click();
    cy.wait("@validateOtp");

    cy.url().should("include", "/home");
  });
});
