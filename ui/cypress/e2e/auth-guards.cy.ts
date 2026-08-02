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

describe("Auth route guards", () => {
  it("redirects unauthenticated users away from /home", () => {
    cy.mockCommonApis();
    cy.visit("/home");
    cy.url().should("not.include", "/home");
  });

  it("redirects authenticated users from welcome to /home", () => {
    cy.visitAuthed("/");
    cy.url().should("include", "/home");
    cy.tid("home-container").should("be.visible");
  });

  it("shows invalid action state for unknown subject action", () => {
    cy.visitAuthed("/shelf-cypress-1/unknown/subject-cypress-1");
    cy.tid("invalid-action-state").should("contain.text", "Unknown action");
  });
});
