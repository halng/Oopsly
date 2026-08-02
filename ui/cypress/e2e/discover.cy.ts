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

import { IDS } from "../fixtures/api";
import { tokens } from "../support/tokens";

describe("Discover public decks", () => {
  it("lists mocked decks with titles, counts, and clone CTA", () => {
    cy.visitAuthed("/discover");
    cy.wait("@discover");

    cy.tid("discover-screen").should("be.visible");
    cy.contains("Discover Public Decks").should("be.visible");
    cy.tid("discover-search-input")
      .should("have.attr", "placeholder")
      .and("match", /search public decks/i);

    cy.tid(`discover-deck-${IDS.deck1}`).should("be.visible");
    cy.contains("Spanish A1 Starter").should("be.visible");
    cy.contains("Beginner Spanish essentials").should("be.visible");
    cy.contains("40").should("be.visible");

    cy.tid(`discover-deck-${IDS.deck2}`).should("contain.text", "Java Streams");
    cy.tid(`discover-clone-${IDS.deck1}`)
      .should("contain.text", "Clone")
      .assertRgb("background-color", tokens.accent);
  });

  it("clones a deck and shows success toast + cloned state", () => {
    cy.visitAuthed("/discover");
    cy.wait("@discover");

    cy.tid(`discover-clone-${IDS.deck1}`).click();
    cy.wait("@cloneDeck");
    cy.tid("discover-toast").should(
      "contain.text",
      "Deck added to your library!",
    );
    cy.tid(`discover-clone-${IDS.deck1}`).should("contain.text", "Cloned");
  });

  it("shows empty state when API returns no decks", () => {
    cy.visitAuthed("/discover", { emptyDiscover: true });
    cy.wait("@discover");
    cy.tid("discover-empty-state").should("be.visible");
    cy.contains("No decks found").should("be.visible");
  });

  it("searches and reloads discover results", () => {
    cy.visitAuthed("/discover");
    cy.wait("@discover");
    cy.tid("discover-search-input").clear().type("Spanish");
    cy.wait("@discover");
    cy.tid(`discover-deck-${IDS.deck1}`).should("be.visible");
  });
});
