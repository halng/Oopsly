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

import { tokens } from "../support/tokens";

describe("Welcome carousel", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("shows brand copy, pagination, and accent colors on first slide", () => {
    cy.tid("content-view-title").should("contain.text", "Welcome to Oopsly");
    cy.tid("content-view-subtitle").should(
      "contain.text",
      "The smart way to study",
    );
    cy.tid("pagination-dot-0").assertRgb("background-color", tokens.accent);
    cy.tid("pagination-dot-1").assertRgb("background-color", tokens.border);
    cy.tid("skip-button").should("be.visible").and("contain.text", "Skip");
    cy.tid("next-button").should("be.visible");
  });

  it("navigates through all slides and reaches onboard", () => {
    cy.tid("next-button").click();
    cy.tid("content-view-title").should("contain.text", "Learn Smarter");
    cy.tid("pagination-dot-1").assertRgb("background-color", tokens.accent);

    cy.tid("next-button").click();
    cy.tid("content-view-title").should("contain.text", "Track Progress");
    cy.tid("get-started-text").should("contain.text", "Get Started");

    cy.tid("next-button").click();
    cy.url().should("include", "/onboard");
  });

  it("skips intro to email onboard", () => {
    cy.tid("skip-button").click();
    cy.url().should("include", "/onboard");
    cy.tid("title-text").should("contain.text", "What's your email?");
  });
});
