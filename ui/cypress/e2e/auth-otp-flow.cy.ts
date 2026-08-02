/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { USER } from "../fixtures/api";

function expectDisabled(buttonTestId: string) {
  cy.tid(buttonTestId).should(($el) => {
    const ariaDisabled = $el.attr("aria-disabled");
    const disabled = $el.attr("disabled");
    const isDisabled =
      ariaDisabled === "true" ||
      disabled === "true" ||
      disabled === "" ||
      $el.is(":disabled");
    expect(isDisabled, `${buttonTestId} should be disabled`).to.eq(true);
  });
}

describe("OTP authentication flow", () => {
  it("validates email UI and keeps Continue disabled without a valid email", () => {
    cy.mockCommonApis();
    cy.visit("/onboard");

    cy.tid("email-input-screen").should("exist");
    cy.tid("title-text").should("be.visible").and("contain.text", "What's your email?");
    cy.tid("description-text")
      .should("be.visible")
      .and("contain.text", "We'll send you a secure code");
    cy.tid("email-input")
      .should("have.attr", "placeholder", "name@example.com")
      .and("be.visible");
    cy.tid("continue-button").should("contain.text", "Continue");
    expectDisabled("continue-button");

    cy.tid("email-input").type("not-an-email");
    expectDisabled("continue-button");
  });

  it("sends OTP, verifies digits, and lands on home with mocked library", () => {
    cy.mockCommonApis();
    cy.visit("/onboard");

    cy.tid("email-input").type(USER.email);
    cy.tid("continue-button").click();
    cy.wait("@createOtp");
    cy.url().should("include", "/verification");

    cy.tid("verification-screen").should("exist");
    cy.tid("title-text").should("be.visible").and("contain.text", "Verify your email");
    cy.tid("user-email-display").should("contain.text", USER.email);
    cy.tid("verify-button").should("contain.text", "Verify");

    ["1", "2", "3", "4", "5", "6"].forEach((digit, idx) => {
      cy.tid(`otp-input-${idx}`).type(digit);
    });
    cy.tid("verify-button").click();
    cy.wait("@validateOtp");

    cy.url().should("include", "/home");
    cy.tid("home-container").should("be.visible");
  });

  it("shows resend affordance and timer styling on verification", () => {
    cy.mockCommonApis();
    cy.visit("/onboard");
    cy.tid("email-input").type(USER.email);
    cy.tid("continue-button").click();
    cy.wait("@createOtp");

    cy.contains("I did not receive a code.").should("be.visible");
    cy.tid("resend-button").should("exist");
    cy.tid("timer-text").should("be.visible");
    cy.tid("otp-input-0").should("be.visible");
  });
});
