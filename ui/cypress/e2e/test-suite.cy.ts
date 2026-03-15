// cypress/e2e/test-suite.cy.ts
// Journey: Test Suite management + Question CRUD + Taking a test — full edge case coverage

import { FLATTEN_VIEW_PORTS } from "../support/viewports";

const SHELF_NAME = "E2E Test Shelf";
const TEST_SUITE_TITLE = "Midterm Exam";
const LONG_TITLE = "A".repeat(200);

FLATTEN_VIEW_PORTS.forEach(({ name, width, height }) => {
  describe(`Test Suite Journey - ${name} (${width}x${height})`, () => {
    beforeEach(() => {
      cy.viewport(width, height);
      cy.login();
      cy.get('[data-testid="home-screen"]').should("exist");
    });

    // ─── Create Test Suite ─────────────────────────────────────────────────────
    describe("Create Test Suite", () => {
      it("opens the create test suite modal", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').should("be.visible");
      });

      it("prevents saving with empty title", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="save-test-suite-button"]').click();
        cy.contains(/title.*required|enter.*title/i).should("be.visible");
      });

      it("prevents saving with whitespace-only title", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type("    ");
        cy.get('[data-testid="save-test-suite-button"]').click();
        cy.contains(/title.*required|enter.*title/i).should("be.visible");
      });

      it("handles very long titles gracefully", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type(LONG_TITLE);
        cy.get('[data-testid="save-test-suite-button"]').click();
        // Either created (with truncation) or shows an error — no crash
        cy.contains(/created successfully|title too long/i).should(
          "be.visible",
        );
      });

      it("creates a test suite with special characters in title", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type(
          "Exam #1: Q&A (2025)",
        );
        cy.get('[data-testid="save-test-suite-button"]').click();
        cy.contains(/created successfully/i).should("be.visible");
        cy.contains("Exam #1: Q&A (2025)").should("be.visible");
      });

      it("cancels create without saving", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type("Cancel Me");
        cy.get('[data-testid="cancel-modal-button"]').click();
        cy.contains("Cancel Me").should("not.exist");
      });

      it("creates a test suite and appears in the shelf list", () => {
        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type(TEST_SUITE_TITLE);
        cy.get('[data-testid="save-test-suite-button"]').click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains(TEST_SUITE_TITLE).should("be.visible");
      });

      it("shows API error when creation fails", () => {
        cy.intercept("POST", "**/test-suites*", {
          statusCode: 500,
          body: { isSuccess: false, message: "Server error" },
        }).as("createSuite");

        cy.contains(SHELF_NAME)
          .parent()
          .find('[data-testid="add-test-suite-button"]')
          .click();
        cy.get('[data-testid="test-suite-title-input"]').type("Should Fail");
        cy.get('[data-testid="save-test-suite-button"]').click();

        cy.wait("@createSuite");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Test Suite Detail ────────────────────────────────────────────────────
    describe("Test Suite Detail Screen", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
        cy.get('[data-testid="test-suite-detail-screen"]').should("exist");
      });

      it("shows the correct test suite title in the header", () => {
        cy.contains(TEST_SUITE_TITLE).should("be.visible");
      });

      it("disables Take Test button when there are no questions", () => {
        cy.get('[data-testid="take-test-button"]').should("be.disabled");
      });

      it("shows empty state message when no questions exist", () => {
        cy.contains(/no questions|add first question/i).should("be.visible");
      });

      it("navigates back to shelf from test suite detail", () => {
        cy.get('[data-testid="back-button"]').click();
        cy.contains(TEST_SUITE_TITLE).should("be.visible"); // Back on shelf page
      });
    });

    // ─── Add Questions — Validation ───────────────────────────────────────────
    describe("Question Validation", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
        cy.get('[data-testid="add-question-button"]').click();
      });

      it("prevents saving a question with empty content", () => {
        cy.contains("Save Question").click();
        cy.contains(/content.*required|enter.*question/i).should("be.visible");
      });

      it("prevents saving a SINGLE_CHOICE question with no correct option selected", () => {
        cy.contains("SINGLE CHOICE").click();
        cy.get('[placeholder="Enter question text"]').type("What is 2+2?");
        cy.get('[placeholder="Option A"]').type("3");
        cy.get('[placeholder="Option B"]').type("4");
        // Don't select any correct answer
        cy.contains("Save Question").click();
        cy.contains(/select.*correct|correct.*required/i).should("be.visible");
      });

      it("prevents saving a MULTIPLE_CHOICE question with no correct options selected", () => {
        cy.contains("MULTIPLE CHOICE").click();
        cy.get('[placeholder="Enter question text"]').type(
          "Select the even numbers.",
        );
        cy.get('[placeholder="Option A"]').type("1");
        cy.get('[placeholder="Option B"]').type("2");
        // No correct options selected
        cy.contains("Save Question").click();
        cy.contains(/select.*correct|correct.*required/i).should("be.visible");
      });

      it("prevents saving a FILL_IN_THE_BLANK question with empty answer", () => {
        cy.contains("FILL IN THE BLANK").click();
        cy.get('[placeholder="Enter question text"]').type(
          "The capital of ___ is Paris.",
        );
        // Don't fill in the answer
        cy.contains("Save Question").click();
        cy.contains(/answer.*required|enter.*answer/i).should("be.visible");
      });

      it("prevents saving SINGLE_CHOICE with empty option fields", () => {
        cy.contains("SINGLE CHOICE").click();
        cy.get('[placeholder="Enter question text"]').type("What?");
        // Leave options blank, select option 0 as correct
        cy.get('[data-testid="option-selector-0"]').click();
        cy.contains("Save Question").click();
        cy.contains(/option.*required|fill.*options/i).should("be.visible");
      });

      it("shows API error when question creation fails", () => {
        cy.intercept("POST", "**/questions*", {
          statusCode: 500,
          body: { isSuccess: false, message: "Failed to create" },
        }).as("createQuestion");

        cy.contains("FILL IN THE BLANK").click();
        cy.get('[placeholder="Enter question text"]').type("What is H2O?");
        cy.get('[placeholder="Expected answer (e.g. Washington)"]').type(
          "Water",
        );
        cy.contains("Save Question").click();

        cy.wait("@createQuestion");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Add Questions — All Types Happy Path ─────────────────────────────────
    describe("Adding All Question Types", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
      });

      it("adds a SINGLE_CHOICE question successfully", () => {
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("SINGLE CHOICE").click();
        cy.get('[placeholder="Enter question text"]').type(
          "Powerhouse of the cell?",
        );
        cy.get('[placeholder="Option A"]').type("Nucleus");
        cy.get('[placeholder="Option B"]').type("Mitochondria");
        cy.get('[placeholder="Option C"]').type("Ribosome");
        cy.get('[placeholder="Option D"]').type("Golgi Body");
        cy.get('[data-testid="option-selector-1"]').click();
        cy.contains("Save Question").click();

        cy.contains(/created successfully/i).should("be.visible");
        cy.contains("Powerhouse of the cell?").should("be.visible");
      });

      it("adds a MULTIPLE_CHOICE question successfully", () => {
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("MULTIPLE CHOICE").click();
        cy.get('[placeholder="Enter question text"]').type(
          "Select prime numbers.",
        );
        cy.get('[placeholder="Option A"]').type("2");
        cy.get('[placeholder="Option B"]').type("3");
        cy.get('[placeholder="Option C"]').type("4");
        cy.get('[placeholder="Option D"]').type("6");
        cy.get('[data-testid="option-selector-0"]').click();
        cy.get('[data-testid="option-selector-1"]').click();
        cy.contains("Save Question").click();

        cy.contains(/created successfully/i).should("be.visible");
      });

      it("adds a TRUE_FALSE question with True as correct", () => {
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("TRUE FALSE").click();
        cy.get('[placeholder="Enter question text"]').type(
          "The sun is a star.",
        );
        cy.get('[data-testid="option-selector-0"]').click();
        cy.contains("Save Question").click();

        cy.contains(/created successfully/i).should("be.visible");
      });

      it("adds a TRUE_FALSE question with False as correct", () => {
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("TRUE FALSE").click();
        cy.get('[placeholder="Enter question text"]').type(
          "The moon is a planet.",
        );
        cy.get('[data-testid="option-selector-1"]').click(); // False
        cy.contains("Save Question").click();

        cy.contains(/created successfully/i).should("be.visible");
      });

      it("adds a FILL_IN_THE_BLANK question successfully", () => {
        cy.get('[data-testid="add-question-button"]').click();
        cy.contains("FILL IN THE BLANK").click();
        cy.get('[placeholder="Enter question text"]').type(
          "The capital of France is ___.",
        );
        cy.get('[placeholder="Expected answer (e.g. Washington)"]').type(
          "Paris",
        );
        cy.contains("Save Question").click();

        cy.contains(/created successfully/i).should("be.visible");
      });

      it("shows correct question count after adding 5 questions", () => {
        cy.contains(/5 questions ready/i).should("be.visible");
      });
    });

    // ─── Edit Questions ────────────────────────────────────────────────────────
    describe("Edit Questions", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
      });

      it("opens the edit modal pre-filled with question data", () => {
        cy.contains("Powerhouse of the cell?")
          .parent()
          .find('[data-testid="edit-question-button"]')
          .click();
        cy.get('[data-testid="question-content-input"]').should(
          "not.have.value",
          "",
        );
      });

      it("updates a question and shows updated content", () => {
        cy.contains("Powerhouse of the cell?")
          .parent()
          .find('[data-testid="edit-question-button"]')
          .click();
        cy.get('[data-testid="question-content-input"]')
          .clear()
          .type("Updated question content?");
        cy.contains("Update Question").click();

        cy.contains(/updated successfully/i).should("be.visible");
        cy.contains("Updated question content?").should("be.visible");
        cy.contains("Powerhouse of the cell?").should("not.exist");
      });

      it("cancels edit without saving changes", () => {
        cy.contains("Updated question content?")
          .parent()
          .find('[data-testid="edit-question-button"]')
          .click();
        cy.get('[data-testid="question-content-input"]')
          .clear()
          .type("WILL NOT SAVE");
        cy.get('[data-testid="cancel-modal-button"]').click();
        cy.contains("WILL NOT SAVE").should("not.exist");
      });

      it("shows API error when update fails", () => {
        cy.intercept("PUT", "**/questions/**", {
          statusCode: 503,
          body: { isSuccess: false, message: "Update failed" },
        }).as("updateQuestion");

        cy.get('[data-testid="question-item"]')
          .first()
          .find('[data-testid="edit-question-button"]')
          .click();
        cy.get('[data-testid="question-content-input"]')
          .clear()
          .type("Something new");
        cy.contains("Update Question").click();

        cy.wait("@updateQuestion");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Delete Questions ──────────────────────────────────────────────────────
    describe("Delete Questions", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
      });

      it("shows confirmation before deleting a question", () => {
        cy.get('[data-testid="question-item"]')
          .first()
          .find('[data-testid="delete-question-button"]')
          .click();
        cy.contains(/are you sure|confirm delete/i).should("be.visible");
      });

      it("cancels deletion and question remains", () => {
        cy.get('[data-testid="question-item"]')
          .first()
          .find('[data-testid="delete-question-button"]')
          .click();
        cy.get('[data-testid="cancel-delete-button"]').click();
        cy.get('[data-testid="question-item"]').should(
          "have.length.at.least",
          1,
        );
      });

      it("deletes a question successfully", () => {
        cy.get('[data-testid="question-item"]')
          .first()
          .then(($q) => {
            const content = $q.find('[data-testid="question-content"]').text();
            cy.wrap($q).find('[data-testid="delete-question-button"]').click();
            cy.get('[data-testid="confirm-delete-button"]').click();

            cy.contains(/deleted successfully/i).should("be.visible");
            cy.contains(content).should("not.exist");
          });
      });

      it("shows API error when deletion fails", () => {
        cy.intercept("DELETE", "**/questions/**", {
          statusCode: 500,
          body: { isSuccess: false, message: "Deletion failed" },
        }).as("deleteQuestion");

        cy.get('[data-testid="question-item"]')
          .first()
          .find('[data-testid="delete-question-button"]')
          .click();
        cy.get('[data-testid="confirm-delete-button"]').click();

        cy.wait("@deleteQuestion");
        cy.contains(/failed|error/i).should("be.visible");
      });
    });

    // ─── Take Test — Full Journey ──────────────────────────────────────────────
    describe("Taking the Test", () => {
      beforeEach(() => {
        cy.contains(TEST_SUITE_TITLE).click();
        cy.contains("Take Test").click();
      });

      it("shows the first question and 1/N indicator", () => {
        cy.contains(/1 \//i).should("be.visible");
      });

      it("disables Submit button until all questions are answered", () => {
        cy.contains("Submit Test").should("be.disabled");
      });

      it("can navigate to next question after answering", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains(/2 \//i).should("be.visible");
      });

      it("can navigate backward to previous question", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("Previous").click();
        cy.contains(/1 \//i).should("be.visible");
      });

      it("changes answer on single-choice question (last selection wins)", () => {
        cy.contains("Nucleus").click();
        cy.contains("Mitochondria").click();
        // Nucleus should be deselected, Mitochondria selected
        cy.get('[data-testid="option-1"]').should("have.class", "selected");
        cy.get('[data-testid="option-0"]').should("not.have.class", "selected");
      });

      it("toggles multiple-choice selections on/off", () => {
        cy.contains("Next").click(); // Q1 unanswered, just move
        cy.contains("2").click(); // Select
        cy.contains("2").click(); // Deselect
        cy.get('[data-testid="option-0"]').should("not.have.class", "selected");
      });

      it("accepts any value in fill-in-the-blank input", () => {
        // Navigate to last question (fill in the blank)
        // Answer all prior questions first
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]')
          .type("Paris")
          .should("have.value", "Paris");
      });

      it("shows results after submitting all answers (correct answers)", () => {
        // Answer all questions correctly
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("Paris");
        cy.contains("Submit Test").click();

        cy.contains("Test Complete!").should("be.visible");
        cy.contains("%").should("be.visible");
      });

      it("shows score 0% when all answers are wrong", () => {
        cy.contains("Nucleus").click();
        cy.contains("Next").click();
        cy.contains("4").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("London");
        cy.contains("Submit Test").click();

        cy.contains("0%").should("be.visible");
      });

      it("shows 100% when all answers are correct", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("Paris");
        cy.contains("Submit Test").click();

        cy.contains("100%").should("be.visible");
      });

      it("grades FILL_IN_THE_BLANK case-insensitively", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("PARIS"); // uppercase
        cy.contains("Submit Test").click();

        cy.contains("100%").should("be.visible");
      });

      it("shows correct/incorrect indicators per question in results", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("Paris");
        cy.contains("Submit Test").click();

        cy.get('[data-testid="result-correct"]').should(
          "have.length.at.least",
          1,
        );
      });

      it("can retake the test and resets to Q1", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("Paris");
        cy.contains("Submit Test").click();

        cy.contains("Test Complete!").should("be.visible");
        cy.contains("Retake Test").click();
        cy.contains(/1 \//i).should("be.visible");
      });

      it("navigates home after completing the test", () => {
        cy.contains("Mitochondria").click();
        cy.contains("Next").click();
        cy.contains("2").click();
        cy.contains("3").click();
        cy.contains("Next").click();
        cy.contains("True").click();
        cy.contains("Next").click();
        cy.contains("False").click();
        cy.contains("Next").click();
        cy.get('[placeholder="Type your answer here..."]').type("Paris");
        cy.contains("Submit Test").click();

        cy.contains("Home").click();
        cy.get('[data-testid="home-screen"]').should("exist");
      });
    });

    // ─── Delete Test Suite ─────────────────────────────────────────────────────
    describe("Delete Test Suite", () => {
      it("shows confirmation before deleting a test suite", () => {
        cy.contains(TEST_SUITE_TITLE)
          .parent()
          .find('[data-testid="delete-test-suite-button"]')
          .click();
        cy.contains(/are you sure|confirm delete/i).should("be.visible");
      });

      it("cancels deletion and suite remains", () => {
        cy.contains(TEST_SUITE_TITLE)
          .parent()
          .find('[data-testid="delete-test-suite-button"]')
          .click();
        cy.get('[data-testid="cancel-delete-button"]').click();
        cy.contains(TEST_SUITE_TITLE).should("exist");
      });
    });
  });
});
