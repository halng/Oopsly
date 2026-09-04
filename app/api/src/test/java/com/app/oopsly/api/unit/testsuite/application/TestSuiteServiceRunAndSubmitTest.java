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

package com.app.oopsly.api.unit.testsuite.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.domain.CardEntity;
import com.app.oopsly.api.card.domain.DifficultyLevel;
import com.app.oopsly.api.card.infrastructure.CardRepository;
import com.app.oopsly.api.library.domain.ShelfEntity;
import com.app.oopsly.api.library.domain.SubjectEntity;
import com.app.oopsly.api.library.infrastructure.ShelfRepository;
import com.app.oopsly.api.library.infrastructure.SubjectRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.testsuite.application.TestSuiteServiceImpl;
import com.app.oopsly.api.testsuite.application.vm.QuestionBreakdown;
import com.app.oopsly.api.testsuite.application.vm.TestRunCardRes;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionReq;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionRes;
import com.app.oopsly.api.testsuite.application.vm.TestSuiteRes;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.SelectionMode;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.domain.TestSuiteSelectionPayload;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.app.oopsly.api.user.application.UserService;
import com.app.oopsly.api.user.domain.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/** Covers the run / submit / auto-generate flows of the test suite service. */
@ExtendWith(MockitoExtension.class)
class TestSuiteServiceRunAndSubmitTest {

    @Mock private TestSuiteRepository testSuiteRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private CardRepository cardRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private UserService userService;

    private TestSuiteServiceImpl service;

    private User currentUser;
    private ShelfEntity shelve;
    private SubjectEntity subject;
    private TestSuiteEntity suite;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        service =
                new TestSuiteServiceImpl(
                        testSuiteRepository,
                        shelfRepository,
                        subjectRepository,
                        cardRepository,
                        questionRepository,
                        new ObjectMapper(),
                        userService);

        currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setEmail("learner@test.dev");
        currentUser.setTotalXp(240);

        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();

        shelve = new ShelfEntity();
        shelve.setId(shelveId);
        shelve.setUser(currentUser);

        subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        subject.setName("Algebra");
        subject.setShelf(shelve);

        suite = TestSuiteEntity.builder().title("Chapter 1").isActive(true).shelf(shelve).build();
        suite.setId(testSuiteId);
        suite.setSubjects(new ArrayList<>(List.of(subject)));
    }

    private void currentUserOwnsShelve() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
    }

    private CardEntity card(String front, String back) {
        CardEntity card = new CardEntity();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);
        card.setFront(front);
        card.setBack(back);
        card.setDifficultyLevel(DifficultyLevel.GOOD);
        card.setNextPracticeTime(Instant.now());
        card.setNumberOfPractice(2);
        return card;
    }

    private QuestionEntity question(String text, String metadata) {
        QuestionEntity question = new QuestionEntity();
        question.setId(UUID.randomUUID());
        question.setText(text);
        question.setMetadata(metadata);
        return question;
    }

    @SuppressWarnings("unchecked")
    private <T> T dataOf(ApiRes response) {
        return (T) response.getBody().data();
    }

    // -------------------------------------------------------------------- run

    @Test
    void run_withoutLinkedSubjectsReturnsEmptySelection() {
        suite.setSubjects(new ArrayList<>());
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));

        ApiRes response = service.run(shelveId, testSuiteId);

        assertTrue(response.getBody().isSuccess());
        assertTrue(this.<List<TestRunCardRes>>dataOf(response).isEmpty());
        verifyNoInteractions(cardRepository);
    }

    @Test
    void run_withNullSubjectsReturnsEmptySelection() {
        suite.setSubjects(null);
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));

        assertTrue(this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).isEmpty());
    }

    @Test
    void run_withoutMatchingCardsReturnsEmptySelection() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList())).thenReturn(List.of());

        assertTrue(this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).isEmpty());
    }

    @Test
    void run_defaultSelectionReturnsEveryCard() {
        CardEntity card = card("2+2", "4");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList())).thenReturn(List.of(card));

        List<TestRunCardRes> cards = dataOf(service.run(shelveId, testSuiteId));

        assertEquals(1, cards.size());
        assertEquals(card.getId(), cards.get(0).id());
        assertEquals("2+2", cards.get(0).front());
        assertEquals("4", cards.get(0).back());
        assertEquals(subject.getId(), cards.get(0).subjectId());
        assertEquals(DifficultyLevel.GOOD, cards.get(0).difficultyLevel());
    }

    @Test
    void run_dueOnlySelectionQueriesDueCards() {
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.DUE_ONLY, null, null));
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findDueBySubjects(anyList(), any(Instant.class)))
                .thenReturn(List.of(card("due", "yes")));

        assertEquals(
                1, this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).size());
        verify(cardRepository).findDueBySubjects(anyList(), any(Instant.class));
    }

    @Test
    void run_randomSelectionAppliesTheDefaultSampleSize() {
        List<CardEntity> pool =
                IntStream.range(0, TestSuiteSelectionPayload.RANDOM_DEFAULT_LIMIT + 5)
                        .mapToObj(i -> card("q" + i, "a" + i))
                        .toList();
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.RANDOM, null, null));
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList())).thenReturn(pool);

        assertEquals(
                TestSuiteSelectionPayload.RANDOM_DEFAULT_LIMIT,
                this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).size());
    }

    @Test
    void run_explicitLimitCapsTheSelection() {
        List<CardEntity> pool =
                IntStream.range(0, 10).mapToObj(i -> card("q" + i, "a" + i)).toList();
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.ALL, 3, Boolean.TRUE));
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList())).thenReturn(pool);

        assertEquals(
                3, this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).size());
    }

    @Test
    void run_negativeLimitIsClampedToOneCard() {
        List<CardEntity> pool =
                IntStream.range(0, 4).mapToObj(i -> card("q" + i, "a" + i)).toList();
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.RANDOM, -5, Boolean.FALSE));
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList())).thenReturn(pool);

        assertEquals(
                1, this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).size());
    }

    @Test
    void run_selectionWithNullModeFallsBackToAll() {
        suite.setSelection(new TestSuiteSelectionPayload(null, null, null));
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(anyList()))
                .thenReturn(List.of(card("q", "a")));

        assertEquals(
                1, this.<List<TestRunCardRes>>dataOf(service.run(shelveId, testSuiteId)).size());
    }

    @Test
    void run_unknownSuiteThrowsNotFound() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.run(shelveId, testSuiteId));
    }

    @Test
    void run_shelveOfAnotherUserThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.run(shelveId, testSuiteId));
        verifyNoInteractions(testSuiteRepository);
    }

    // ----------------------------------------------------------------- submit

    @Test
    void submit_scoresAnswersAndGrantsXp() {
        QuestionEntity correctQuestion =
                question(
                        "2+2?",
                        "{\"options\":[\"3\",\"4\"],\"correctOptionIndex\":1,\"explanation\":\"basic\"}");
        QuestionEntity wrongQuestion =
                question("3+3?", "{\"options\":[\"6\",\"7\"],\"correctOptionIndex\":0}");
        Map<UUID, Integer> answers = new HashMap<>();
        answers.put(correctQuestion.getId(), 1);
        answers.put(wrongQuestion.getId(), 1);

        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite))
                .thenReturn(List.of(correctQuestion, wrongQuestion));

        ApiRes response = service.submit(shelveId, testSuiteId, new TestSubmissionReq(answers, 90));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        TestSubmissionRes result = dataOf(response);
        assertEquals(1, result.score());
        assertEquals(2, result.totalQuestions());
        assertEquals(50, result.percentage());
        assertEquals(90, result.timeSpentSeconds());
        assertEquals(
                GamificationRules.XP_PER_CORRECT_ANSWER
                        + GamificationRules.XP_TEST_COMPLETION_BONUS,
                result.xpGained());
        assertEquals(240, result.totalXp());

        List<QuestionBreakdown> breakdown = result.breakdown();
        assertEquals(2, breakdown.size());
        assertTrue(breakdown.get(0).isCorrect());
        assertEquals("basic", breakdown.get(0).explanation());
        assertFalse(breakdown.get(1).isCorrect());
        assertNull(breakdown.get(1).explanation());

        verify(userService).updateUserProgress(result.xpGained());
        assertEquals(50, suite.getHighestScore());
        verify(testSuiteRepository).save(suite);
    }

    @Test
    void submit_withoutQuestionsScoresFullMarks() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of());

        TestSubmissionRes result =
                dataOf(service.submit(shelveId, testSuiteId, new TestSubmissionReq(null, null)));

        assertEquals(0, result.score());
        assertEquals(0, result.totalQuestions());
        assertEquals(100, result.percentage());
        assertEquals(0, result.timeSpentSeconds());
        assertEquals(GamificationRules.XP_TEST_COMPLETION_BONUS, result.xpGained());
    }

    @Test
    void submit_doesNotDowngradeAPreviousHigherScore() {
        suite.setHighestScore(100);
        QuestionEntity question = question("q", "{\"correctOptionIndex\":0}");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of(question));

        service.submit(shelveId, testSuiteId, new TestSubmissionReq(Map.of(), 10));

        assertEquals(100, suite.getHighestScore());
        verify(testSuiteRepository, never()).save(any());
    }

    @Test
    void submit_withNullTotalXpFallsBackToTheGainedXp() {
        currentUser.setTotalXp(null);
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of());

        TestSubmissionRes result =
                dataOf(service.submit(shelveId, testSuiteId, new TestSubmissionReq(null, 0)));

        assertEquals(GamificationRules.XP_TEST_COMPLETION_BONUS, result.totalXp());
    }

    @Test
    void submit_handlesMissingBlankAndCorruptedMetadata() {
        QuestionEntity nullMetadata = question("q1", null);
        QuestionEntity blankMetadata = question("q2", "   ");
        QuestionEntity corruptedMetadata = question("q3", "{ not json");
        QuestionEntity noCorrectIndex = question("q4", "{\"options\":[\"a\"]}");

        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite))
                .thenReturn(
                        List.of(nullMetadata, blankMetadata, corruptedMetadata, noCorrectIndex));

        TestSubmissionRes result =
                dataOf(
                        service.submit(
                                shelveId,
                                testSuiteId,
                                new TestSubmissionReq(Map.of(nullMetadata.getId(), 0), 5)));

        assertEquals(0, result.score());
        assertEquals(4, result.totalQuestions());
        result.breakdown().forEach(item -> assertFalse(item.isCorrect()));
        assertNull(result.breakdown().get(0).correctAnswer());
    }

    @Test
    void submit_unknownSuiteThrowsNotFound() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        TestSubmissionReq request = new TestSubmissionReq(Map.of(), 0);
        assertThrows(NotFoundException.class, () -> service.submit(shelveId, testSuiteId, request));
    }

    // ----------------------------------------------------------- autoGenerate

    @Test
    void autoGenerate_createsASuiteForTheSubject() {
        currentUserOwnsShelve();
        when(subjectRepository.findByIdAndShelve(subject.getId(), shelve))
                .thenReturn(Optional.of(subject));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes response = service.autoGenerate(shelveId, subject.getId(), 10);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        TestSuiteRes result = dataOf(response);
        assertEquals("Auto: Algebra", result.title());
        assertTrue(result.isActive());
        assertEquals(List.of(subject.getId()), result.subjectIds());
    }

    @Test
    void autoGenerate_unknownSubjectThrowsNotFound() {
        UUID unknownSubject = UUID.randomUUID();
        currentUserOwnsShelve();
        when(subjectRepository.findByIdAndShelve(unknownSubject, shelve))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> service.autoGenerate(shelveId, unknownSubject, 5));
    }

    // -------------------------------------------------------------- fallbacks

    @Test
    void runFallback_wrapsInfrastructureFailures() {
        assertThrows(
                RetryLaterException.class,
                () -> service.runFallback(shelveId, testSuiteId, new IllegalStateException("db")));
    }

    @Test
    void runFallback_preservesNotFound() {
        assertThrows(
                NotFoundException.class,
                () -> service.runFallback(shelveId, testSuiteId, new NotFoundException("gone")));
    }

    @Test
    void submitFallback_wrapsInfrastructureFailures() {
        TestSubmissionReq request = new TestSubmissionReq(Map.of(), 0);
        assertThrows(
                RetryLaterException.class,
                () ->
                        service.submitFallback(
                                shelveId, testSuiteId, request, new IllegalStateException("db")));
    }

    @Test
    void submitFallback_preservesNotFound() {
        TestSubmissionReq request = new TestSubmissionReq(Map.of(), 0);
        assertThrows(
                NotFoundException.class,
                () ->
                        service.submitFallback(
                                shelveId, testSuiteId, request, new NotFoundException("gone")));
    }
}
