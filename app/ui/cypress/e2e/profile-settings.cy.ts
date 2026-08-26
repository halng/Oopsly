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
import { tokens } from "../support/tokens";

describe("Profile screen", () => {
  it("renders email, display name, bio, and completeness", () => {
    cy.visitAuthed("/profile");
    cy.wait("@profile");

    cy.tid("profile-screen").should("be.visible");
    cy.contains("Profile").should("be.visible");
    cy.tid("profile-email").should("contain.text", USER.email);
    cy.tid("profile-display-name").should("contain.text", USER.displayName);
    cy.tid("profile-bio").should("contain.text", USER.bio);
    cy.tid("profile-completion-title").should(
      "contain.text",
      "Profile completeness",
    );
    cy.contains("Settings").should("be.visible");
  });

  it("edits display name and saves via mocked PATCH", () => {
    cy.visitAuthed("/profile");
    cy.wait("@profile");

    cy.tid("edit-button").click();
    cy.tid("display-name-input").clear().type("Updated Cypress");
    cy.tid("bio-input").clear().type("Updated bio");
    cy.tid("save-button").click();
    cy.wait("@updateProfile");
    cy.tid("profile-success").should("contain.text", "Profile updated");
    cy.tid("profile-display-name").should("contain.text", "Updated Cypress");
  });

  it("opens settings from profile link", () => {
    cy.visitAuthed("/profile");
    cy.tid("profile-settings-link").click();
    cy.url().should("include", "/settings");
  });
});

describe("Settings screen", () => {
  it("renders appearance options and study schedule fields", () => {
    cy.visitAuthed("/settings");
    cy.wait("@profile");

    cy.tid("settings-screen").should("be.visible");
    cy.contains("Settings").should("be.visible");
    cy.contains("Theme and study schedule").should("be.visible");
    cy.contains("Appearance").should("be.visible");
    cy.tid("theme-option-light").should("contain.text", "Light");
    cy.tid("theme-option-dark").should("contain.text", "Dark");
    cy.tid("theme-option-system").should("contain.text", "System");

    cy.tid("study-schedule-section").should("be.visible");
    cy.contains("Study schedule").should("be.visible");
    cy.tid("study-time-input").should("have.value", "09:00");
    cy.tid("study-day-1").should("contain.text", "Mon");
    cy.tid("reminder-toggle").should("exist");
    cy.tid("save-schedule-button").should("contain.text", "Save schedule");
  });

  it("highlights selected theme with accent tint", () => {
    cy.visitAuthed("/settings");
    cy.wait("@profile");
    cy.tid("theme-option-light").assertRgb(
      "background-color",
      tokens.accentTint,
    );
  });

  it("changes theme and syncs settings", () => {
    cy.visitAuthed("/settings");
    cy.wait("@profile");
    cy.tid("theme-option-dark").click();
    cy.wait("@updateSettings");
  });

  it("saves study schedule changes", () => {
    cy.visitAuthed("/settings");
    cy.wait("@profile");

    cy.tid("study-time-input").clear().type("18:30");
    cy.tid("study-day-0").click();
    cy.tid("reminder-toggle").click({ force: true });
    cy.tid("save-schedule-button").click();
    cy.wait("@updateSettings");
    cy.tid("settings-success").should("contain.text", "Study schedule saved");
  });

  it("navigates back from settings header", () => {
    cy.visitAuthed("/settings");
    cy.tid("settings-header-back-button").click();
  });
});
