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
package com.app.quizi.api.unit.shared.plan;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.app.quizi.api.card.CardRepository;
import com.app.quizi.api.shared.exception.PlanLimitException;
import com.app.quizi.api.shared.exception.ValidationException;
import com.app.quizi.api.shared.plan.PlanLimitService;
import com.app.quizi.api.shared.plan.PlanLimits;
import com.app.quizi.api.shared.security.CurrentUser;
import com.app.quizi.api.shelf.Shelf;
import com.app.quizi.api.shelf.ShelfRepository;
import com.app.quizi.api.subject.Subject;
import com.app.quizi.api.subject.SubjectRepository;
import com.app.quizi.api.testsuite.domain.TestSuiteEntity;
import com.app.quizi.api.testsuite.infrastructure.QuestionRepository;
import com.app.quizi.api.testsuite.infrastructure.TestSuiteRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanLimitServiceTest {

    @Mock private CurrentUser currentUser;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private TestSuiteRepository testSuiteRepository;
    @Mock private CardRepository cardRepository;
    @Mock private QuestionRepository questionRepository;

    private PlanLimitService service;
    private final UUID userId = UUID.randomUUID();
    private final Shelf deck = new Shelf();
    private final Subject subject = new Subject();
    private final TestSuiteEntity suite = new TestSuiteEntity();

    @BeforeEach
    void setUp() {
        service =
                new PlanLimitService(
                        currentUser,
                        shelfRepository,
                        subjectRepository,
                        testSuiteRepository,
                        cardRepository,
                        questionRepository);
    }

    @Test
    void freeLimitsAreTheDocumentedOnes() {
        PlanLimits free = PlanLimits.forPlan(PlanLimits.FREE_PLAN);
        assertEquals(10, free.decks());
        assertEquals(5, free.subjectsPerDeck());
        assertEquals(5, free.testSuitesPerDeck());
        assertEquals(25, free.cardsPerSubject());
        assertEquals(25, free.questionsPerTestSuite());
    }

    @Test
    void aMissingOrUnknownPlanIsFree() {
        assertEquals("Free", PlanLimits.forPlan(null).planName());
        assertEquals("Free", PlanLimits.forPlan("GOLD").planName());
    }

    @Test
    void proAllowsMoreThanFree() {
        PlanLimits free = PlanLimits.forPlan(PlanLimits.FREE_PLAN);
        PlanLimits pro = PlanLimits.forPlan(PlanLimits.PRO_PLAN);
        assertEquals(true, pro.decks() > free.decks());
        assertEquals(true, pro.cardsPerSubject() > free.cardsPerSubject());
    }

    @Test
    void proPlusHasNoLimits() {
        PlanLimits proPlus = PlanLimits.forPlan(PlanLimits.PRO_PLUS_PLAN);
        assertEquals("Pro Plus", proPlus.planName());
        assertEquals(PlanLimits.UNLIMITED, proPlus.decks());
        assertEquals(PlanLimits.UNLIMITED, proPlus.subjectsPerDeck());
        assertEquals(PlanLimits.UNLIMITED, proPlus.testSuitesPerDeck());
        assertEquals(PlanLimits.UNLIMITED, proPlus.cardsPerSubject());
        assertEquals(PlanLimits.UNLIMITED, proPlus.questionsPerTestSuite());
    }

    @Test
    void aProPlusUserIsNeverStopped() {
        when(currentUser.plan()).thenReturn(PlanLimits.PRO_PLUS_PLAN);
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.countByUserId(userId)).thenReturn(1_000_000L);
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(1_000_000L);
        assertDoesNotThrow(service::requireDeckSlot);
        assertDoesNotThrow(() -> service.requireCardSlots(subject, 100_000));
        assertDoesNotThrow(() -> service.requireCardsFit(10_000_000L));
        assertDoesNotThrow(() -> service.requireQuestionsFit(10_000_000L));
    }

    @Test
    void theTenthDeckIsAllowedAndTheEleventhIsNot() {
        when(currentUser.plan()).thenReturn(PlanLimits.FREE_PLAN);
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.countByUserId(userId)).thenReturn(9L);
        assertDoesNotThrow(service::requireDeckSlot);

        when(shelfRepository.countByUserId(userId)).thenReturn(10L);
        PlanLimitException ex = assertThrows(PlanLimitException.class, service::requireDeckSlot);
        assertEquals(
                "The Free plan allows up to 10 decks. Upgrade your plan to add more.",
                ex.getMessage());
    }

    @Test
    void aProUserGetsTheProLimit() {
        when(currentUser.plan()).thenReturn(PlanLimits.PRO_PLAN);
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.countByUserId(userId)).thenReturn(10L);
        assertDoesNotThrow(service::requireDeckSlot);
    }

    @Test
    void subjectsAndTestSuitesAreLimitedPerDeck() {
        when(currentUser.plan()).thenReturn(PlanLimits.FREE_PLAN);
        when(subjectRepository.countByShelf(deck)).thenReturn(5L);
        when(testSuiteRepository.countByShelf(deck)).thenReturn(4L);
        assertThrows(PlanLimitException.class, () -> service.requireSubjectSlot(deck));
        assertDoesNotThrow(() -> service.requireTestSuiteSlot(deck));
    }

    @Test
    void addingCardsCannotPassTheLimitEvenInOneBatch() {
        when(currentUser.plan()).thenReturn(PlanLimits.FREE_PLAN);
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(20L);
        assertDoesNotThrow(() -> service.requireCardSlots(subject, 5));
        assertThrows(PlanLimitException.class, () -> service.requireCardSlots(subject, 6));
    }

    @Test
    void addingQuestionsCannotPassTheLimitEvenInOneBatch() {
        when(currentUser.plan()).thenReturn(PlanLimits.FREE_PLAN);
        when(questionRepository.countByTestSuite(suite)).thenReturn(25L);
        assertThrows(PlanLimitException.class, () -> service.requireQuestionSlots(suite, 1));
    }

    @Test
    void copiesMustFitTheCallersPlan() {
        when(currentUser.plan()).thenReturn(PlanLimits.FREE_PLAN);
        assertDoesNotThrow(() -> service.requireCardsFit(25));
        assertThrows(PlanLimitException.class, () -> service.requireCardsFit(26));
        assertDoesNotThrow(() -> service.requireQuestionsFit(25));
        assertThrows(PlanLimitException.class, () -> service.requireQuestionsFit(26));
    }

    @Test
    void theLimitErrorIsAValidationErrorSoServicesLetItThrough() {
        assertThrows(
                ValidationException.class,
                () -> {
                    throw new PlanLimitException("x");
                });
    }
}
