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

import { IDS, mockCards, mockSubject } from "../fixtures/api";
import { tokens } from "../support/tokens";

const shelfId = IDS.shelf;
const subjectId = IDS.subject;

describe("Subject detail", () => {
  it("shows subject meta, progress, actions, and card list", () => {
    cy.visitAuthed(`/${shelfId}/view/${subjectId}`);
    cy.wait("@subject");
    cy.wait("@cards");

    cy.tid("subject-detail-screen").should("be.visible");
    cy.tid("subject-name-text").should("contain.text", mockSubject.name);
    cy.tid("progress-label").should("contain.text", "Progress");
    cy.tid("progress-percentage").should(
      "contain.text",
      String(mockSubject.completedPercent),
    );

    cy.tid("review-due-cards-title").should("contain.text", "Review Due Cards");
    cy.tid("learn-mode-button-text").should("contain.text", "Learn");
    cy.tid("match-mode-button-text").should("contain.text", "Match");
    cy.tid("add-card-button-text").should("contain.text", "Add Card");
    cy.tid("settings-button-text").should("contain.text", "Settings");
    cy.tid("card-list-title").should("contain.text", "Cards in this subject");

    cy.tid(`card-item-${IDS.card1}`).should("be.visible");
    cy.tid(`card-front-${IDS.card1}`).should(
      "contain.text",
      mockCards.entities[0].front,
    );
    cy.tid(`card-back-${IDS.card1}`).should(
      "contain.text",
      mockCards.entities[0].back,
    );
  });

  it("shows empty cards CTA when subject has no cards", () => {
    cy.visitAuthed(`/${shelfId}/view/${subjectId}`, { emptyCards: true });
    cy.wait("@cards");
    cy.tid("empty-cards-container").should("be.visible");
    cy.tid("add-card-button-text").should("contain.text", "Add Your First Card");
  });
});

describe("Flashcard review", () => {
  it("loads study session with mode label and rating colors", () => {
    cy.visitAuthed(`/${shelfId}/review/${subjectId}`);
    cy.wait("@cards");

    cy.tid("session-mode-label").should("contain.text", "Study");
    cy.contains("Question").should("be.visible");
    cy.contains("Tap to reveal answer").should("be.visible");
    cy.contains("Acquire").should("be.visible");

    cy.contains("Tap to reveal answer").click();
    cy.contains("Answer").should("be.visible");
    cy.contains("To get or obtain something").should("be.visible");

    cy.tid("rating-again-button").should("contain.text", "Again");
    cy.tid("rating-again-button")
      .children()
      .first()
      .assertRgb("background-color", tokens.error);
    cy.tid("rating-hard-button").should("contain.text", "Hard");
    cy.tid("rating-hard-button")
      .children()
      .first()
      .assertRgb("background-color", tokens.warning);
    cy.tid("rating-good-button").should("contain.text", "Good");
    cy.tid("rating-good-button")
      .children()
      .first()
      .assertRgb("background-color", tokens.success);
    cy.tid("rating-easy-button").should("contain.text", "Easy");
    cy.tid("rating-easy-button")
      .children()
      .first()
      .assertRgb("background-color", tokens.accent);
  });

  it("rates a card and advances", () => {
    cy.visitAuthed(`/${shelfId}/review/${subjectId}`);
    cy.wait("@cards");
    cy.contains("Tap to reveal answer").click();
    cy.tid("rating-good-button").click();
    cy.contains("Negotiate").should("be.visible");
  });

  it("shows empty state when no cards", () => {
    cy.visitAuthed(`/${shelfId}/review/${subjectId}`, { emptyCards: true });
    cy.tid("empty-cards-state").should("be.visible");
  });
});

describe("Learn mode", () => {
  it("renders multiple-choice prompt and options from mocked cards", () => {
    cy.visitAuthed(`/${shelfId}/learn/${subjectId}`);
    cy.wait("@cards");

    cy.tid("learn-mode-screen").should("be.visible");
    cy.tid("learn-progress-label").should("contain.text", "mastered");
    cy.tid("learn-card").should("be.visible");
    cy.contains(/Multiple Choice|Written/).should("be.visible");
  });

  it("answers a written or MC question when controls are present", () => {
    cy.visitAuthed(`/${shelfId}/learn/${subjectId}`);
    cy.wait("@cards");

    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="learn-option-0"]').length) {
        cy.tid("learn-option-0").click();
      } else if ($body.find('[data-testid="learn-written-input"]').length) {
        cy.tid("learn-written-input").type("Acquire");
        cy.tid("learn-check-button").should("contain.text", "Check").click();
      }
    });
  });

  it("shows empty learn state without cards", () => {
    cy.visitAuthed(`/${shelfId}/learn/${subjectId}`, { emptyCards: true });
    cy.tid("learn-empty-state").should("be.visible");
  });
});

describe("Matching game", () => {
  it("renders terms, timer, and pair tiles", () => {
    cy.visitAuthed(`/${shelfId}/match/${subjectId}`);
    cy.wait("@cards");

    cy.tid("match-game-screen").should("be.visible");
    cy.tid("match-timer").should("be.visible");
    cy.tid("match-pairs-count").should("contain.text", "matched");
    cy.contains("Terms").should("be.visible");
    cy.tid(`match-front-${IDS.card1}`).should("contain.text", "Acquire");
    cy.tid(`match-back-${IDS.card1}`).should(
      "contain.text",
      "To get or obtain something",
    );
  });

  it("matches a correct pair", () => {
    cy.visitAuthed(`/${shelfId}/match/${subjectId}`);
    cy.wait("@cards");
    cy.tid(`match-front-${IDS.card1}`).click();
    cy.tid(`match-back-${IDS.card1}`).click();
    cy.tid("match-pairs-count").should("contain.text", "1");
  });

  it("shows empty match state without cards", () => {
    cy.visitAuthed(`/${shelfId}/match/${subjectId}`, { emptyCards: true });
    cy.tid("match-empty-state").should("be.visible");
  });
});

describe("Review complete", () => {
  it("shows celebration copy and navigation CTAs", () => {
    cy.visitAuthed(`/${shelfId}/complete/${subjectId}?duration=90000`);

    cy.contains("Great Job!").should("be.visible");
    cy.contains("You've crushed your daily goal.").should("be.visible");
    cy.contains("Cards").should("be.visible");
    cy.contains("Accuracy").should("be.visible");
    cy.contains("Time").should("be.visible");
    cy.tid("complete-back-to-subject-button").should(
      "contain.text",
      "Back to Subject",
    );
    cy.tid("complete-review-again-button").should(
      "contain.text",
      "Review Again",
    );
  });
});

describe("Take test route", () => {
  it("shows missing-params state without shelfId", () => {
    cy.visitAuthed(`/take-test/${IDS.testSuite}`);
    cy.tid("take-test-missing-params").should(
      "contain.text",
      "Missing test data",
    );
  });
});
