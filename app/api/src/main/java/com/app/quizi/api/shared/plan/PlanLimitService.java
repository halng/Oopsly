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
package com.app.quizi.api.shared.plan;

import com.app.quizi.api.card.CardRepository;
import com.app.quizi.api.shared.exception.PlanLimitException;
import com.app.quizi.api.shared.security.CurrentUser;
import com.app.quizi.api.shelf.Shelf;
import com.app.quizi.api.shelf.ShelfRepository;
import com.app.quizi.api.subject.Subject;
import com.app.quizi.api.subject.SubjectRepository;
import com.app.quizi.api.testsuite.domain.TestSuiteEntity;
import com.app.quizi.api.testsuite.infrastructure.QuestionRepository;
import com.app.quizi.api.testsuite.infrastructure.TestSuiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Enforces the caller's plan limits. Every {@code require...} method throws a {@link
 * PlanLimitException} when adding the given amount would pass the limit.
 */
@Component
@RequiredArgsConstructor
public class PlanLimitService {

    private final CurrentUser currentUser;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final CardRepository cardRepository;
    private final QuestionRepository questionRepository;

    public PlanLimits limits() {
        return PlanLimits.forPlan(currentUser.plan());
    }

    public void requireDeckSlot() {
        PlanLimits limits = limits();
        long used = shelfRepository.countByUserId(currentUser.id());
        check(used + 1, limits.decks(), limits, "decks");
    }

    public void requireSubjectSlot(Shelf deck) {
        PlanLimits limits = limits();
        long used = subjectRepository.countByShelf(deck);
        check(used + 1, limits.subjectsPerDeck(), limits, "subjects in a deck");
    }

    public void requireTestSuiteSlot(Shelf deck) {
        PlanLimits limits = limits();
        long used = testSuiteRepository.countByShelf(deck);
        check(used + 1, limits.testSuitesPerDeck(), limits, "test suites in a deck");
    }

    public void requireCardSlots(Subject subject, int adding) {
        PlanLimits limits = limits();
        long used = cardRepository.countBySubjectAndDeletedFalse(subject);
        check(used + adding, limits.cardsPerSubject(), limits, "cards in a subject");
    }

    public void requireQuestionSlots(TestSuiteEntity testSuite, int adding) {
        PlanLimits limits = limits();
        long used = questionRepository.countByTestSuite(testSuite);
        check(used + adding, limits.questionsPerTestSuite(), limits, "questions in a test suite");
    }

    /** A copy of a subject with this many cards must fit in a subject of the caller's plan. */
    public void requireCardsFit(long cards) {
        PlanLimits limits = limits();
        check(cards, limits.cardsPerSubject(), limits, "cards in a subject");
    }

    /** A copy of a test suite with this many questions must fit in one of the caller's plan. */
    public void requireQuestionsFit(long questions) {
        PlanLimits limits = limits();
        check(questions, limits.questionsPerTestSuite(), limits, "questions in a test suite");
    }

    private static void check(long wanted, int max, PlanLimits limits, String what) {
        if (wanted > max) {
            throw new PlanLimitException(
                    "The "
                            + limits.planName()
                            + " plan allows up to "
                            + max
                            + " "
                            + what
                            + ". Upgrade your plan to add more.");
        }
    }
}
