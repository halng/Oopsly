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

import { mockStats, USER } from "../fixtures/api";
import { tokens } from "../support/tokens";

describe("Stats screen", () => {
  it("renders overview cards with mocked stats values", () => {
    cy.visitAuthed("/stats");
    cy.wait("@stats");

    cy.tid("stats-screen").should("be.visible");
    cy.contains("Statistics").should("be.visible");
    cy.contains("Your learning overview").should("be.visible");

    cy.tid("stats-streak-card").should("contain.text", String(mockStats.dailyStreak));
    cy.tid("stats-streak-card").should("contain.text", "day streak");
    cy.tid("stats-xp-card").should("contain.text", String(mockStats.totalXp));
    cy.tid("stats-xp-card").should("contain.text", "total XP");
    cy.tid("stats-reviewed-today-card").should(
      "contain.text",
      String(mockStats.cardsReviewedToday),
    );
    cy.tid("stats-total-cards-card").should(
      "contain.text",
      String(mockStats.totalCards),
    );
    cy.tid("stats-due-cards-card").should(
      "contain.text",
      String(mockStats.dueCards),
    );
    cy.tid("stats-retention-card").should("be.visible");
    cy.tid("stats-weekly-chart-card").should("be.visible");
  });

  it("links to leaderboard preview", () => {
    cy.visitAuthed("/stats");
    cy.wait("@stats");
    cy.tid("stats-leaderboard-link")
      .should("contain.text", "leaderboard")
      .click();
    cy.url().should("include", "/leaderboard");
  });

  it("shows error state when stats fail", () => {
    cy.visitAuthed("/stats", { statsError: true });
    cy.tid("stats-error-state").should("be.visible");
  });
});

describe("Leaderboard screen", () => {
  it("shows preview banner, standing, and current-user row", () => {
    cy.visitAuthed("/leaderboard");
    cy.wait("@stats");
    cy.wait("@profile");

    cy.tid("leaderboard-screen").should("be.visible");
    cy.contains("Leaderboard").should("be.visible");
    cy.tid("leaderboard-preview-banner")
      .should("contain.text", "Preview rankings")
      .assertRgb("background-color", tokens.accentTint);

    cy.tid("your-standing-card").should("be.visible");
    cy.tid("standing-xp").should("contain.text", String(mockStats.totalXp));
    cy.tid("standing-streak").should(
      "contain.text",
      String(mockStats.dailyStreak),
    );
    cy.tid("leaderboard-row-current").should("contain.text", USER.displayName);
    cy.tid("leaderboard-row-current").should("contain.text", "(you)");
    cy.contains("Ava Chen").should("be.visible");
    cy.contains("demo").should("be.visible");
  });

  it("navigates to personal stats", () => {
    cy.visitAuthed("/leaderboard");
    cy.tid("leaderboard-stats-link")
      .should("contain.text", "View full personal stats")
      .click();
    cy.url().should("include", "/stats");
  });
});
