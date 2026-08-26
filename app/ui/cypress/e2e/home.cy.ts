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

import { IDS, mockStats, mockSubject } from "../fixtures/api";

describe("Home / library", () => {
  it("renders desktop library content, streak, shelf, and subject card", () => {
    cy.viewport(1280, 800);
    cy.visitAuthed("/home");

    cy.tid("home-container").should("be.visible");
    cy.tid("desktop-library-title").should("contain.text", "Your Library");
    cy.tid("desktop-sidebar").should("be.visible");
    cy.tid("sidebar-streak-text").should("contain.text", String(mockStats.dailyStreak));

    cy.contains("Language Shelf").should("be.visible");
    cy.tid(`subject-card-${IDS.subject}`).should("be.visible");
    cy.tid(`subject-name-text-${IDS.subject}`).should(
      "contain.text",
      mockSubject.name,
    );
    cy.tid(`subject-due-text-${IDS.subject}`).should("contain.text", "due");
    cy.tid(`subject-progress-text-${IDS.subject}`).should(
      "contain.text",
      String(mockSubject.completedPercent),
    );
  });

  it("renders mobile nav labels and quote", () => {
    cy.viewport(390, 844);
    cy.visitAuthed("/home");

    cy.tid("app-title-text").should("contain.text", "Oopsly");
    cy.tid("streak-count-text").should("contain.text", String(mockStats.dailyStreak));
    cy.tid("quote-text").should("be.visible");
    cy.tid("quote-author-text").should("contain.text", "Helen Hayes");
    cy.tid("create-shelf-label-text").should("contain.text", "Create Shelf");
    cy.tid("discover-label-text").should("contain.text", "Discover");
    cy.tid("leaderboard-label-text").should("contain.text", "Ranks");
    cy.tid("profile-label-text").should("contain.text", "Profile");
  });

  it("opens create-shelf panel and submits mocked create", () => {
    cy.viewport(1280, 800);
    cy.visitAuthed("/home");

    cy.tid("desktop-create-shelf-button").click();
    cy.tid("right-panel").should("be.visible");
    cy.tid("panel-title").should("contain.text", "Create");
    cy.tid("shelf-name-input").type("Cypress Shelf");
    cy.tid("shelf-description-input").type("Created in e2e");
    cy.tid("create-shelf-submit-button").click();
    cy.wait("@createShelf");
  });

  it("navigates from sidebar to discover, stats, profile, settings", () => {
    cy.viewport(1280, 800);
    cy.visitAuthed("/home");

    cy.tid("sidebar-discover-btn").click();
    cy.url().should("include", "/discover");
    cy.tid("discover-screen").should("be.visible");

    cy.visitAuthed("/home");
    cy.tid("sidebar-stats-btn").click();
    cy.url().should("include", "/stats");

    cy.visitAuthed("/home");
    cy.tid("sidebar-profile-btn").click();
    cy.url().should("include", "/profile");

    cy.visitAuthed("/home");
    cy.tid("sidebar-settings-btn").click();
    cy.url().should("include", "/settings");
  });

  it("opens subject detail from subject card", () => {
    cy.viewport(1280, 800);
    cy.visitAuthed("/home");
    cy.tid(`subject-card-${IDS.subject}`).click();
    cy.url().should("include", `/${IDS.shelf}/view/${IDS.subject}`);
    cy.tid("subject-detail-screen").should("be.visible");
  });
});
