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
import static org.mockito.Mockito.*;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.testsuite.application.QuestionMetadataMapper;
import com.app.oopsly.api.testsuite.application.QuestionServiceImpl;
import com.app.oopsly.api.testsuite.application.vm.BulkQuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionRes;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class QuestionServiceImplTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock private QuestionRepository questionRepository;
    @Mock private TestSuiteRepository testSuiteRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private CurrentUser currentUser;

    private QuestionServiceImpl questionService;
    private UUID userId;
    private Shelf shelf;
    private TestSuiteEntity testSuite;
    private UUID shelfId;
    private UUID testSuiteId;
    private UUID questionId;

    @BeforeEach
    void setUp() {
        questionService =
                new QuestionServiceImpl(
                        questionRepository,
                        testSuiteRepository,
                        shelfRepository,
                        new QuestionMetadataMapper(objectMapper),
                        currentUser);
        shelfId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        userId = UUID.randomUUID();
        shelf = new Shelf();
        shelf.setId(shelfId);
        testSuite = new TestSuiteEntity();
        testSuite.setId(testSuiteId);
        testSuite.setShelf(shelf);
    }

    private void ownsSuite() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelf))
                .thenReturn(Optional.of(testSuite));
    }

    private static QuestionReq single(String text, List<String> options, Integer index) {
        return new QuestionReq(
                text, QuestionType.SINGLE_CHOICE, options, index, null, null, null, " why ");
    }

    private QuestionEntity captureSaved() {
        ArgumentCaptor<QuestionEntity> captor = ArgumentCaptor.forClass(QuestionEntity.class);
        verify(questionRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void createBulk_savesEveryQuestion_andReturnsThemInOrder() {
        ownsSuite();
        when(questionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ApiRes result =
                questionService.createBulk(
                        shelfId,
                        testSuiteId,
                        new BulkQuestionReq(
                                List.of(
                                        single("One?", List.of("a", "b"), 0),
                                        single("Two?", List.of("a", "b"), 1))));

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        @SuppressWarnings("unchecked")
        List<QuestionRes> data = (List<QuestionRes>) result.getBody().data();
        assertEquals(List.of("One?", "Two?"), data.stream().map(QuestionRes::text).toList());
    }

    @Test
    void createBulk_invalidQuestion_failsWholeBatchWithRowNumber() {
        ownsSuite();

        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () ->
                                questionService.createBulk(
                                        shelfId,
                                        testSuiteId,
                                        new BulkQuestionReq(
                                                List.of(
                                                        single("One?", List.of("a", "b"), 0),
                                                        single("Two?", List.of("a", "b"), 5)))));

        assertTrue(ex.getMessage().startsWith("Question 2: "));
        verify(questionRepository, never()).saveAll(anyList());
    }

    @Test
    void createBulk_unknownSuite_throwsNotFound() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        questionService.createBulk(
                                shelfId,
                                testSuiteId,
                                new BulkQuestionReq(
                                        List.of(single("One?", List.of("a", "b"), 0)))));
    }

    @Test
    void create_storesNormalizedMetadata_andReturnsTypedQuestion() throws Exception {
        ownsSuite();
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(
                        inv -> {
                            QuestionEntity q = inv.getArgument(0);
                            q.setId(questionId);
                            return q;
                        });

        ApiRes result =
                questionService.create(
                        shelfId, testSuiteId, single("  2+2?  ", List.of(" 3 ", "4"), 1));

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        QuestionEntity saved = captureSaved();
        assertEquals("2+2?", saved.getText());
        assertSame(testSuite, saved.getTestSuite());
        JsonNode json = objectMapper.readTree(saved.getMetadata());
        assertEquals("3", json.get("options").get(0).asText());
        assertEquals(1, json.get("correctOptionIndex").asInt());
        assertEquals("why", json.get("explanation").asText());
        assertFalse(json.has("acceptedAnswers"));

        QuestionRes res = (QuestionRes) result.getBody().data();
        assertEquals(questionId, res.id());
        assertEquals(QuestionType.SINGLE_CHOICE, res.type());
        assertEquals(List.of("3", "4"), res.options());
        assertEquals(1, res.correctOptionIndex());
    }

    @Test
    void create_trueFalse_forcesOptions() {
        ownsSuite();
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes result =
                questionService.create(
                        shelfId,
                        testSuiteId,
                        new QuestionReq(
                                "Sky is blue",
                                QuestionType.TRUE_FALSE,
                                List.of("ignored"),
                                0,
                                null,
                                null,
                                null,
                                null));

        QuestionRes res = (QuestionRes) result.getBody().data();
        assertEquals(List.of("True", "False"), res.options());
        assertEquals(0, res.correctOptionIndex());
    }

    @Test
    void create_fillInTheBlank_mapsAcceptedAnswers() {
        ownsSuite();
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes result =
                questionService.create(
                        shelfId,
                        testSuiteId,
                        new QuestionReq(
                                "Capital of France is ___",
                                QuestionType.FILL_IN_THE_BLANK,
                                null,
                                null,
                                null,
                                List.of("Paris", " paris "),
                                true,
                                null));

        QuestionRes res = (QuestionRes) result.getBody().data();
        assertEquals(List.of("Paris", "paris"), res.acceptedAnswers());
        assertTrue(res.caseSensitive());
        assertEquals(List.of(), res.options());
    }

    @Test
    void create_invalidQuestion_throwsValidationAndDoesNotSave() {
        ownsSuite();

        QuestionReq invalid = single("2+2?", List.of("4"), 0);
        assertThrows(
                ValidationException.class,
                () -> questionService.create(shelfId, testSuiteId, invalid));
        verify(questionRepository, never()).save(any());
    }

    @Test
    void create_shelfOfAnotherUser_throwsNotFound() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.empty());

        QuestionReq req = single("q", List.of("a", "b"), 0);
        assertThrows(
                NotFoundException.class, () -> questionService.create(shelfId, testSuiteId, req));
        verifyNoInteractions(testSuiteRepository, questionRepository);
    }

    @Test
    void create_suiteOutsideShelf_throwsNotFound() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelf))
                .thenReturn(Optional.empty());

        QuestionReq req = single("q", List.of("a", "b"), 0);
        assertThrows(
                NotFoundException.class, () -> questionService.create(shelfId, testSuiteId, req));
    }

    @Test
    void update_replacesTypeAndMetadata() throws Exception {
        QuestionEntity existing = new QuestionEntity();
        existing.setId(questionId);
        existing.setText("old");
        existing.setType(QuestionType.SINGLE_CHOICE);
        existing.setMetadata("{\"options\":[\"a\",\"b\"],\"correctOptionIndex\":0}");
        ownsSuite();
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(existing));

        ApiRes result =
                questionService.update(
                        shelfId,
                        testSuiteId,
                        questionId,
                        new QuestionReq(
                                "Primes",
                                QuestionType.MULTIPLE_CHOICE,
                                List.of("2", "3", "4"),
                                null,
                                List.of(1, 0, 1),
                                null,
                                null,
                                null));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(QuestionType.MULTIPLE_CHOICE, existing.getType());
        assertEquals(
                "[0,1]",
                objectMapper
                        .readTree(existing.getMetadata())
                        .get("correctOptionIndexes")
                        .toString());
        verify(questionRepository).save(existing);
    }

    @Test
    void update_unknownQuestion_throwsNotFound() {
        ownsSuite();
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.empty());

        QuestionReq req = single("q", List.of("a", "b"), 0);
        assertThrows(
                NotFoundException.class,
                () -> questionService.update(shelfId, testSuiteId, questionId, req));
    }

    @Test
    void delete_softDeletes() {
        QuestionEntity existing = new QuestionEntity();
        existing.setId(questionId);
        ownsSuite();
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(existing));

        questionService.delete(shelfId, testSuiteId, questionId);

        assertTrue(existing.getDeleted());
        verify(questionRepository).save(existing);
    }

    @Test
    void getById_readsLegacyMetadata() {
        QuestionEntity existing = new QuestionEntity();
        existing.setId(questionId);
        existing.setText("Old TF");
        existing.setType(QuestionType.TRUE_FALSE);
        existing.setMetadata("{\"correct_value\":true}");
        ownsSuite();
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(existing));

        QuestionRes res =
                (QuestionRes)
                        questionService.getById(shelfId, testSuiteId, questionId).getBody().data();

        assertEquals(0, res.correctOptionIndex());
    }

    @Test
    void getAllByTestSuite_mapsEveryQuestion() {
        QuestionEntity a = new QuestionEntity();
        a.setType(QuestionType.SINGLE_CHOICE);
        a.setMetadata(null);
        QuestionEntity b = new QuestionEntity();
        b.setType(QuestionType.FILL_IN_THE_BLANK);
        b.setMetadata("not json");
        ownsSuite();
        when(questionRepository.findAllByTestSuite(testSuite)).thenReturn(List.of(a, b));

        List<?> data =
                (List<?>) questionService.getAllByTestSuite(shelfId, testSuiteId).getBody().data();

        assertEquals(2, data.size());
        assertEquals(List.of(), ((QuestionRes) data.get(1)).options());
    }

    @Test
    void fallbacks_preserveDomainErrors_andWrapOthers() {
        assertThrows(
                ValidationException.class,
                () ->
                        questionService.createFallback(
                                shelfId, testSuiteId, null, new ValidationException("bad")));
        assertThrows(
                NotFoundException.class,
                () ->
                        questionService.getByIdFallback(
                                shelfId, testSuiteId, questionId, new NotFoundException("x")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        questionService.deleteFallback(
                                shelfId,
                                testSuiteId,
                                questionId,
                                new UnauthenticatedException("x")));
        assertThrows(
                RetryLaterException.class,
                () ->
                        questionService.updateFallback(
                                shelfId, testSuiteId, questionId, null, new RuntimeException()));
        assertThrows(
                RetryLaterException.class,
                () ->
                        questionService.getAllByTestSuiteFallback(
                                shelfId, testSuiteId, new RuntimeException()));
    }

    @Test
    void createBulk_fallback_preservesDomainErrors_andWrapsOthers() {
        BulkQuestionReq req = new BulkQuestionReq(List.of(single("Q?", List.of("a", "b"), 0)));
        assertThrows(
                ValidationException.class,
                () ->
                        questionService.createBulkFallback(
                                shelfId, testSuiteId, req, new ValidationException("bad")));
        assertThrows(
                NotFoundException.class,
                () ->
                        questionService.createBulkFallback(
                                shelfId, testSuiteId, req, new NotFoundException("x")));
        assertThrows(
                RetryLaterException.class,
                () ->
                        questionService.createBulkFallback(
                                shelfId, testSuiteId, req, new RuntimeException()));
    }

    @Test
    void createBulk_numbersTheFirstInvalidRow_evenWhenLaterOnesAreInvalidToo() {
        ownsSuite();

        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () ->
                                questionService.createBulk(
                                        shelfId,
                                        testSuiteId,
                                        new BulkQuestionReq(
                                                List.of(
                                                        single("One?", List.of("a", "b"), 7),
                                                        single("Two?", List.of("a", "b"), 9)))));

        assertTrue(ex.getMessage().startsWith("Question 1: "));
    }

    @Test
    void createBulk_unknownTestSuite_throwsNotFound_andSavesNothing() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelf))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        questionService.createBulk(
                                shelfId,
                                testSuiteId,
                                new BulkQuestionReq(
                                        List.of(single("One?", List.of("a", "b"), 0)))));
        verify(questionRepository, never()).saveAll(anyList());
    }

    @Test
    void createBulk_attachesEverySavedQuestionToTheSuite() {
        ownsSuite();
        when(questionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        questionService.createBulk(
                shelfId,
                testSuiteId,
                new BulkQuestionReq(
                        List.of(
                                single("One?", List.of("a", "b"), 0),
                                single("Two?", List.of("a", "b"), 1))));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<QuestionEntity>> saved = ArgumentCaptor.forClass(List.class);
        verify(questionRepository).saveAll(saved.capture());
        assertEquals(2, saved.getValue().size());
        assertTrue(saved.getValue().stream().allMatch(q -> q.getTestSuite() == testSuite));
    }
}
