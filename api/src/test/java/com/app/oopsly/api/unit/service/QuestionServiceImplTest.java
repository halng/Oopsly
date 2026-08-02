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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.QuestionEntity;
import com.app.oopsly.api.entity.QuestionType;
import com.app.oopsly.api.entity.TestSuiteEntity;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.QuestionRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.impl.QuestionServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuestionServiceImplTest {

    @Mock private QuestionRepository questionRepository;

    @Mock private TestSuiteRepository testSuiteRepository;

    @Spy private ObjectMapper objectMapper;

    @InjectMocks private QuestionServiceImpl questionService;

    private TestSuiteEntity testSuite;
    private UUID testSuiteId;
    private UUID questionId;

    @BeforeEach
    void setUp() {
        testSuiteId = UUID.randomUUID();
        questionId = UUID.randomUUID();

        testSuite = new TestSuiteEntity();
        testSuite.setId(testSuiteId);
        testSuite.setTitle("Test Suite");
        testSuite.setIsActive(true);
        testSuite.setDeleted(false);
    }

    @Test
    void create_savesNewQuestion_withMultipleChoice() {
        String metadata = "{\"options\":[\"A\",\"B\",\"C\"],\"correct_indices\":[0,2]}";
        QuestionReq questionReq =
                new QuestionReq("What is 2+2?", QuestionType.MULTIPLE_CHOICE, metadata);

        QuestionEntity savedQuestion = new QuestionEntity();
        savedQuestion.setId(questionId);
        savedQuestion.setText(questionReq.text());
        savedQuestion.setType(questionReq.type());
        savedQuestion.setMetadata(questionReq.metadata());
        savedQuestion.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class))).thenReturn(savedQuestion);

        ApiRes result = questionService.create(testSuiteId, questionReq);

        assertNotNull(result);
        verify(questionRepository, times(1)).save(any(QuestionEntity.class));
    }

    @Test
    void create_savesNewQuestion_withTrueFalse() {
        String metadata = "{\"correct_value\":true}";
        QuestionReq questionReq =
                new QuestionReq("Is the sky blue?", QuestionType.TRUE_FALSE, metadata);

        QuestionEntity savedQuestion = new QuestionEntity();
        savedQuestion.setId(questionId);
        savedQuestion.setText(questionReq.text());
        savedQuestion.setType(questionReq.type());
        savedQuestion.setMetadata(questionReq.metadata());
        savedQuestion.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class))).thenReturn(savedQuestion);

        ApiRes result = questionService.create(testSuiteId, questionReq);

        assertNotNull(result);
        verify(questionRepository, times(1)).save(any(QuestionEntity.class));
    }

    @Test
    void create_savesNewQuestion_withFillBlank() {
        String metadata = "{\"accepted_answers\":[\"photosynthesis\",\"Photosynthesis\"]}";
        QuestionReq questionReq =
                new QuestionReq(
                        "What is the process by which plants make food?",
                        QuestionType.FILL_IN_THE_BLANK,
                        metadata);

        QuestionEntity savedQuestion = new QuestionEntity();
        savedQuestion.setId(questionId);
        savedQuestion.setText(questionReq.text());
        savedQuestion.setType(questionReq.type());
        savedQuestion.setMetadata(questionReq.metadata());
        savedQuestion.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class))).thenReturn(savedQuestion);

        ApiRes result = questionService.create(testSuiteId, questionReq);

        assertNotNull(result);
        verify(questionRepository, times(1)).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsValidationException_whenMultipleChoiceHasNoOptions() {
        String metadata = "{\"correct_indices\":[0,2]}";
        QuestionReq questionReq =
                new QuestionReq("What is 2+2?", QuestionType.MULTIPLE_CHOICE, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        assertThrows(
                ValidationException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsValidationException_whenTrueFalseHasNoCorrectValue() {
        String metadata = "{\"something\":\"else\"}";
        QuestionReq questionReq =
                new QuestionReq("Is the sky blue?", QuestionType.TRUE_FALSE, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        assertThrows(
                ValidationException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsValidationException_whenFillBlankHasNoAcceptedAnswers() {
        String metadata = "{\"something\":\"else\"}";
        QuestionReq questionReq =
                new QuestionReq("Fill in the blank", QuestionType.FILL_IN_THE_BLANK, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        assertThrows(
                ValidationException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsValidationException_whenFillBlankHasEmptyAcceptedAnswers() {
        String metadata = "{\"accepted_answers\":[]}";
        QuestionReq questionReq =
                new QuestionReq("Fill in the blank", QuestionType.FILL_IN_THE_BLANK, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        assertThrows(
                ValidationException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsValidationException_whenMetadataIsInvalidJson() {
        String metadata = "invalid json";
        QuestionReq questionReq =
                new QuestionReq("What is 2+2?", QuestionType.MULTIPLE_CHOICE, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        assertThrows(
                ValidationException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenTestSuiteNotFound() {
        String metadata = "{\"options\":[\"A\",\"B\"],\"correct_indices\":[0]}";
        QuestionReq questionReq =
                new QuestionReq("What is 2+2?", QuestionType.MULTIPLE_CHOICE, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> questionService.create(testSuiteId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void update_updatesExistingQuestion() {
        String metadata = "{\"options\":[\"A\",\"B\",\"C\"],\"correct_indices\":[1]}";
        QuestionReq questionReq =
                new QuestionReq("Updated question?", QuestionType.MULTIPLE_CHOICE, metadata);

        QuestionEntity existingQuestion = new QuestionEntity();
        existingQuestion.setId(questionId);
        existingQuestion.setText("Old question");
        existingQuestion.setType(QuestionType.MULTIPLE_CHOICE);
        existingQuestion.setMetadata("{\"options\":[\"A\",\"B\"],\"correct_indices\":[0]}");
        existingQuestion.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(existingQuestion));
        when(questionRepository.save(any(QuestionEntity.class))).thenReturn(existingQuestion);

        ApiRes result = questionService.update(testSuiteId, questionId, questionReq);

        assertNotNull(result);
        verify(questionRepository, times(1)).save(any(QuestionEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenQuestionNotFound() {
        String metadata = "{\"options\":[\"A\",\"B\"],\"correct_indices\":[0]}";
        QuestionReq questionReq =
                new QuestionReq("Updated question?", QuestionType.MULTIPLE_CHOICE, metadata);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> questionService.update(testSuiteId, questionId, questionReq));
        verify(questionRepository, never()).save(any(QuestionEntity.class));
    }

    @Test
    void delete_softDeletesQuestion() {
        QuestionEntity existingQuestion = new QuestionEntity();
        existingQuestion.setId(questionId);
        existingQuestion.setDeleted(false);
        existingQuestion.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(existingQuestion));
        when(questionRepository.save(any(QuestionEntity.class))).thenReturn(existingQuestion);

        ApiRes result = questionService.delete(testSuiteId, questionId);

        assertNotNull(result);
        assertTrue(existingQuestion.getDeleted());
        verify(questionRepository, times(1)).save(existingQuestion);
    }

    @Test
    void delete_throwsNotFoundException_whenQuestionNotFound() {
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> questionService.delete(testSuiteId, questionId));
    }

    @Test
    void getById_returnsQuestion() {
        QuestionEntity question = new QuestionEntity();
        question.setId(questionId);
        question.setText("Test Question");
        question.setType(QuestionType.TRUE_FALSE);
        question.setMetadata("{\"correct_value\":true}");
        question.setTestSuite(testSuite);

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.of(question));

        ApiRes result = questionService.getById(testSuiteId, questionId);

        assertNotNull(result);
        verify(questionRepository, times(1)).findByIdAndTestSuite(questionId, testSuite);
    }

    @Test
    void getById_throwsNotFoundException_whenQuestionNotFound() {
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findByIdAndTestSuite(questionId, testSuite))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> questionService.getById(testSuiteId, questionId));
    }

    @Test
    void getAllByTestSuite_returnsAllQuestions() {
        List<QuestionEntity> questions = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            QuestionEntity question = new QuestionEntity();
            question.setId(UUID.randomUUID());
            question.setText("QuestionEntity " + i);
            question.setType(QuestionType.TRUE_FALSE);
            question.setMetadata("{\"correct_value\":true}");
            question.setTestSuite(testSuite);
            questions.add(question);
        }

        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.findAllByTestSuite(testSuite)).thenReturn(questions);

        ApiRes result = questionService.getAllByTestSuite(testSuiteId);

        assertNotNull(result);
        verify(questionRepository, times(1)).findAllByTestSuite(testSuite);
    }

    @Test
    void testCreateFallback() {
        UUID testSuiteId = UUID.randomUUID();
        QuestionReq request =
                new QuestionReq(
                        "Test Question",
                        QuestionType.MULTIPLE_CHOICE,
                        "{\"options\":[\"A\",\"B\"],\"correct_indices\":[0]}");
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> questionService.createFallback(testSuiteId, request, exception));

        assertEquals(
                "Question service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testUpdateFallback() {
        UUID testSuiteId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        QuestionReq request =
                new QuestionReq(
                        "Updated Question", QuestionType.TRUE_FALSE, "{\"correct_value\":true}");
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                questionService.updateFallback(
                                        testSuiteId, questionId, request, exception));

        assertEquals(
                "Question service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testDeleteFallback() {
        UUID testSuiteId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> questionService.deleteFallback(testSuiteId, questionId, exception));

        assertEquals(
                "Question service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testGetByIdFallback() {
        UUID testSuiteId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> questionService.getByIdFallback(testSuiteId, questionId, exception));

        assertEquals(
                "Question service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testGetAllByTestSuiteFallback() {
        UUID testSuiteId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> questionService.getAllByTestSuiteFallback(testSuiteId, exception));

        assertEquals(
                "Question service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void create_savesMultipleResponseQuestion() {
        String metadata = "{\"options\":[\"A\",\"B\"],\"correct_indices\":[0,1]}";
        QuestionReq req = new QuestionReq("Pick all", QuestionType.MULTIPLE_RESPONSE, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(
                        inv -> {
                            QuestionEntity q = inv.getArgument(0);
                            q.setId(questionId);
                            return q;
                        });

        assertTrue(questionService.create(testSuiteId, req).getBody().isSuccess());
    }

    @Test
    void create_throwsWhenOptionsNotArray() {
        String metadata = "{\"options\":\"A\",\"correct_indices\":[0]}";
        QuestionReq req = new QuestionReq("Q", QuestionType.MULTIPLE_CHOICE, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(ValidationException.class, () -> questionService.create(testSuiteId, req));
    }

    @Test
    void create_throwsWhenCorrectIndicesNotArray() {
        String metadata = "{\"options\":[\"A\"],\"correct_indices\":0}";
        QuestionReq req = new QuestionReq("Q", QuestionType.MULTIPLE_CHOICE, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(ValidationException.class, () -> questionService.create(testSuiteId, req));
    }

    @Test
    void create_throwsWhenCorrectValueNotBoolean() {
        String metadata = "{\"correct_value\":\"yes\"}";
        QuestionReq req = new QuestionReq("Q", QuestionType.TRUE_FALSE, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(ValidationException.class, () -> questionService.create(testSuiteId, req));
    }

    @Test
    void create_savesMatchingQuestion() {
        String metadata = "{\"pairs\":[{\"left\":\"a\",\"right\":\"b\"}]}";
        QuestionReq req = new QuestionReq("Match", QuestionType.MATCHING, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(
                        inv -> {
                            QuestionEntity q = inv.getArgument(0);
                            q.setId(questionId);
                            return q;
                        });
        assertTrue(questionService.create(testSuiteId, req).getBody().isSuccess());
    }

    @Test
    void create_throwsWhenMatchingMissingPairs() {
        QuestionReq req = new QuestionReq("Match", QuestionType.MATCHING, "{}");
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(ValidationException.class, () -> questionService.create(testSuiteId, req));
    }

    @Test
    void create_savesOrderingQuestion() {
        String metadata = "{\"correct_order\":[\"a\",\"b\"]}";
        QuestionReq req = new QuestionReq("Order", QuestionType.ORDERING, metadata);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        when(questionRepository.save(any(QuestionEntity.class)))
                .thenAnswer(
                        inv -> {
                            QuestionEntity q = inv.getArgument(0);
                            q.setId(questionId);
                            return q;
                        });
        assertTrue(questionService.create(testSuiteId, req).getBody().isSuccess());
    }

    @Test
    void create_throwsWhenOrderingMissingOrder() {
        QuestionReq req = new QuestionReq("Order", QuestionType.ORDERING, "{\"correct_order\":1}");
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(ValidationException.class, () -> questionService.create(testSuiteId, req));
    }

    @Test
    void create_throwsWhenTestSuiteSoftDeleted() {
        testSuite.setDeleted(true);
        QuestionReq req = new QuestionReq("Q", QuestionType.TRUE_FALSE, "{\"correct_value\":true}");
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));
        assertThrows(NotFoundException.class, () -> questionService.create(testSuiteId, req));
    }
}
