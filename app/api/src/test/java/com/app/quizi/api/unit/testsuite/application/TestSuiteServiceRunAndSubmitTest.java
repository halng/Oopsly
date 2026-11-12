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

package com.app.quizi.api.unit.testsuite.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

import com.app.quizi.api.progress.UserProgress;
import com.app.quizi.api.progress.UserProgressService;
import com.app.quizi.api.shared.application.vm.ApiRes;
import com.app.quizi.api.shared.exception.NotFoundException;
import com.app.quizi.api.shared.exception.RetryLaterException;
import com.app.quizi.api.shared.exception.ValidationException;
import com.app.quizi.api.shared.plan.PlanLimitService;
import com.app.quizi.api.shared.security.CurrentUser;
import com.app.quizi.api.shared.util.GamificationRules;
import com.app.quizi.api.shelf.Shelf;
import com.app.quizi.api.shelf.ShelfRepository;
import com.app.quizi.api.testsuite.application.QuestionMetadataMapper;
import com.app.quizi.api.testsuite.application.TestSuiteServiceImpl;
import com.app.quizi.api.testsuite.application.vm.QuestionBreakdown;
import com.app.quizi.api.testsuite.application.vm.TestAttemptRes;
import com.app.quizi.api.testsuite.application.vm.TestSubmissionReq;
import com.app.quizi.api.testsuite.application.vm.TestSubmissionRes;
import com.app.quizi.api.testsuite.domain.QuestionEntity;
import com.app.quizi.api.testsuite.domain.QuestionType;
import com.app.quizi.api.testsuite.domain.TestSuiteEntity;
import com.app.quizi.api.testsuite.infrastructure.QuestionRepository;
import com.app.quizi.api.testsuite.infrastructure.TestSuiteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/** Covers attempt and submit flows of the test suite service. */
@ExtendWith(MockitoExtension.class)
class TestSuiteServiceRunAndSubmitTest {

    @Mock private TestSuiteRepository testSuiteRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private CurrentUser currentUser;
    @Mock private UserProgressService userProgressService;

    private TestSuiteServiceImpl service;

    @Mock private PlanLimitService planLimits;
    private UUID currentUserId;
    private UserProgress progress;
    private Shelf shelve;
    private TestSuiteEntity suite;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        service =
                new TestSuiteServiceImpl(
                        testSuiteRepository,
                        shelfRepository,
                        questionRepository,
                        new QuestionMetadataMapper(new ObjectMapper()),
                        currentUser,
                        userProgressService,
                        planLimits);

        currentUserId = UUID.randomUUID();
        progress = UserProgress.builder().userId(currentUserId).totalXp(120).dailyStreak(3).build();
        lenient().when(userProgressService.updateUserProgress(anyInt())).thenReturn(progress);

        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();

        shelve = new Shelf();
        shelve.setId(shelveId);
        shelve.setUserId(currentUserId);

        suite = TestSuiteEntity.builder().title("Chapter 1").isActive(true).shelf(shelve).build();
        suite.setId(testSuiteId);
    }

    private void currentUserOwnsShelve() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
    }

    private QuestionEntity question(String text, String metadata) {
        return question(text, QuestionType.SINGLE_CHOICE, metadata);
    }

    private QuestionEntity question(String text, QuestionType type, String metadata) {
        QuestionEntity question = new QuestionEntity();
        question.setId(UUID.randomUUID());
        question.setText(text);
        question.setType(type);
        question.setMetadata(metadata);
        return question;
    }

    private TestSubmissionReq answers(Map<UUID, Integer> answers, int seconds) {
        return new TestSubmissionReq(answers, null, null, seconds);
    }

    @SuppressWarnings("unchecked")
    private <T> T dataOf(ApiRes response) {
        return (T) response.getBody().data();
    }

    // -------------------------------------------------------------------- run

    // ---------------------------------------------------------------- attempt

    @Test
    void getAttempt_returnsQuestionsWithoutAnswers() {
        suite.setTimeLimitMinutes(10);
        QuestionEntity single =
                question("2+2?", "{\"options\":[\"3\",\"4\"],\"correctOptionIndex\":1}");
        QuestionEntity blank =
                question(
                        "H2___",
                        QuestionType.FILL_IN_THE_BLANK,
                        "{\"acceptedAnswers\":[\"O\"],\"options\":[\"leak\"]}");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of(single, blank));

        TestAttemptRes attempt = dataOf(service.getAttempt(shelveId, testSuiteId));

        assertEquals(testSuiteId, attempt.testSuiteId());
        assertEquals("Chapter 1", attempt.title());
        assertEquals(600, attempt.timeLimitSeconds());
        assertEquals(List.of("3", "4"), attempt.questions().get(0).options());
        assertEquals(QuestionType.SINGLE_CHOICE, attempt.questions().get(0).type());
        assertTrue(attempt.questions().get(1).options().isEmpty());
    }

    @Test
    void getAttempt_withoutTimeLimit_returnsNullSeconds() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of());

        TestAttemptRes attempt = dataOf(service.getAttempt(shelveId, testSuiteId));

        assertNull(attempt.timeLimitSeconds());
        assertTrue(attempt.questions().isEmpty());
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

        ApiRes response = service.submit(shelveId, testSuiteId, answers(answers, 90));

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
        assertEquals(120, result.totalXp());

        List<QuestionBreakdown> breakdown = result.breakdown();
        assertEquals(2, breakdown.size());
        assertTrue(breakdown.get(0).correct());
        assertEquals("basic", breakdown.get(0).explanation());
        assertEquals("4", breakdown.get(0).correctAnswerText());
        assertEquals(1, breakdown.get(0).userAnswerIndex());
        assertFalse(breakdown.get(1).correct());
        assertNull(breakdown.get(1).explanation());

        verify(userProgressService).updateUserProgress(result.xpGained());
        assertEquals(50, suite.getHighestScore());
        verify(testSuiteRepository).save(suite);
    }

    @Test
    void submit_gradesEveryQuestionType() {
        QuestionEntity trueFalse =
                question(
                        "Sky is blue",
                        QuestionType.TRUE_FALSE,
                        "{\"options\":[\"True\",\"False\"],\"correctOptionIndex\":0}");
        QuestionEntity multi =
                question(
                        "Primes",
                        QuestionType.MULTIPLE_CHOICE,
                        "{\"options\":[\"2\",\"3\",\"4\"],\"correctOptionIndexes\":[0,1]}");
        QuestionEntity partial =
                question(
                        "Evens",
                        QuestionType.MULTIPLE_CHOICE,
                        "{\"options\":[\"2\",\"3\",\"4\"],\"correctOptionIndexes\":[0,2]}");
        QuestionEntity blank =
                question(
                        "Capital of France is ___",
                        QuestionType.FILL_IN_THE_BLANK,
                        "{\"acceptedAnswers\":[\"Paris\"]}");
        QuestionEntity typo =
                question(
                        "Powerhouse of the cell: ___",
                        QuestionType.FILL_IN_THE_BLANK,
                        "{\"acceptedAnswers\":[\"mitochondria\"]}");
        QuestionEntity caseSensitive =
                question(
                        "Symbol for sodium: ___",
                        QuestionType.FILL_IN_THE_BLANK,
                        "{\"acceptedAnswers\":[\"Na\"],\"caseSensitive\":true}");
        QuestionEntity legacyMatching = question("Match", QuestionType.MATCHING, "{}");

        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite))
                .thenReturn(
                        List.of(
                                trueFalse,
                                multi,
                                partial,
                                blank,
                                typo,
                                caseSensitive,
                                legacyMatching));

        TestSubmissionReq request =
                new TestSubmissionReq(
                        Map.of(trueFalse.getId(), 0),
                        Map.of(multi.getId(), List.of(1, 0, 1), partial.getId(), List.of(0)),
                        Map.of(
                                blank.getId(), "  paris ",
                                typo.getId(), "mitocondria",
                                caseSensitive.getId(), "na"),
                        null);

        TestSubmissionRes result = dataOf(service.submit(shelveId, testSuiteId, request));

        List<QuestionBreakdown> b = result.breakdown();
        assertTrue(b.get(0).correct());
        assertTrue(b.get(1).correct());
        assertEquals(List.of(0, 1), b.get(1).userAnswerIndexes());
        assertEquals("2, 3", b.get(1).correctAnswerText());
        assertFalse(b.get(2).correct(), "partial multiple choice answers are wrong");
        assertEquals(List.of(0, 2), b.get(2).correctOptionIndexes());
        assertTrue(b.get(3).correct());
        assertEquals("  paris ", b.get(3).userAnswerText());
        assertEquals("Paris", b.get(3).correctAnswerText());
        assertTrue(b.get(3).options().isEmpty());
        assertTrue(b.get(4).correct(), "one typo is allowed on long answers");
        assertFalse(b.get(5).correct());
        assertFalse(b.get(6).correct());
        assertEquals(4, result.score());
        assertEquals(57, result.percentage());
        assertEquals(0, result.timeSpentSeconds());
    }

    @Test
    void submit_readsLegacySnakeCaseMetadata() {
        QuestionEntity legacySingle =
                question("Old", "{\"options\":[\"a\",\"b\"],\"correct_indices\":[1]}");
        QuestionEntity legacyTrueFalse =
                question("Old TF", QuestionType.TRUE_FALSE, "{\"correct_value\":false}");
        QuestionEntity legacyBlank =
                question(
                        "Old ___",
                        QuestionType.FILL_IN_THE_BLANK,
                        "{\"accepted_answers\":[\"yes\"]}");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite))
                .thenReturn(List.of(legacySingle, legacyTrueFalse, legacyBlank));

        TestSubmissionReq request =
                new TestSubmissionReq(
                        Map.of(legacySingle.getId(), 1, legacyTrueFalse.getId(), 1),
                        null,
                        Map.of(legacyBlank.getId(), "YES"),
                        3);

        TestSubmissionRes result = dataOf(service.submit(shelveId, testSuiteId, request));

        assertEquals(3, result.score());
    }

    @Test
    void submit_withoutQuestionsIsRejected() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of());

        TestSubmissionReq request = new TestSubmissionReq(null, null, null, null);
        assertThrows(
                ValidationException.class, () -> service.submit(shelveId, testSuiteId, request));
        verify(userProgressService, never()).updateUserProgress(anyInt());
    }

    @Test
    void submit_doesNotDowngradeAPreviousHigherScore() {
        suite.setHighestScore(100);
        QuestionEntity question = question("q", "{\"correctOptionIndex\":0}");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of(question));

        service.submit(shelveId, testSuiteId, answers(Map.of(), 10));

        assertEquals(100, suite.getHighestScore());
        verify(testSuiteRepository, never()).save(any());
    }

    @Test
    void submit_withoutStoredXp_reportsGainedXp() {
        progress.setTotalXp(null);
        QuestionEntity question = question("q", "{\"correctOptionIndex\":0}");
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of(question));

        TestSubmissionRes result =
                dataOf(
                        service.submit(
                                shelveId, testSuiteId, answers(Map.of(question.getId(), 0), 1)));

        assertEquals(result.xpGained(), result.totalXp());
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
                                answers(Map.of(nullMetadata.getId(), 0), 5)));

        assertEquals(0, result.score());
        assertEquals(4, result.totalQuestions());
        result.breakdown().forEach(item -> assertFalse(item.correct()));
        assertNull(result.breakdown().get(0).correctOptionIndex());
        assertNull(result.breakdown().get(0).correctAnswerText());
    }

    @Test
    void submit_unknownSuiteThrowsNotFound() {
        currentUserOwnsShelve();
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        TestSubmissionReq request = answers(Map.of(), 0);
        assertThrows(NotFoundException.class, () -> service.submit(shelveId, testSuiteId, request));
    }

    // ----------------------------------------------------------- autoGenerate

    // -------------------------------------------------------------- fallbacks

    @Test
    void submitFallback_wrapsInfrastructureFailures() {
        TestSubmissionReq request = answers(Map.of(), 0);
        assertThrows(
                RetryLaterException.class,
                () ->
                        service.submitFallback(
                                shelveId, testSuiteId, request, new IllegalStateException("db")));
    }

    @Test
    void submitFallback_preservesNotFound() {
        TestSubmissionReq request = answers(Map.of(), 0);
        assertThrows(
                NotFoundException.class,
                () ->
                        service.submitFallback(
                                shelveId, testSuiteId, request, new NotFoundException("gone")));
    }
}
