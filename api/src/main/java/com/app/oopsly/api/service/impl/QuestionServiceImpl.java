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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.QuestionEntity;
import com.app.oopsly.api.entity.QuestionType;
import com.app.oopsly.api.entity.TestSuiteEntity;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.QuestionRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.QuestionService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import com.app.oopsly.api.viewmodel.QuestionRes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.List;
import java.util.UUID;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionServiceImpl implements QuestionService {

    // Metadata property name constants
    private static final String METADATA_OPTIONS = "options";
    private static final String METADATA_CORRECT_INDICES = "correct_indices";
    private static final String METADATA_CORRECT_VALUE = "correct_value";
    private static final String METADATA_ACCEPTED_ANSWERS = "accepted_answers";
    private static final String METADATA_PAIRS = "pairs";
    private static final String METADATA_CORRECT_ORDER = "correct_order";

    private final QuestionRepository questionRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final ObjectMapper objectMapper;

    @Override
    @CacheEvict(value = "questions", key = "#testSuiteId + ':all'")
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID testSuiteId, QuestionReq request) {
        log.info("Creating question for test suite {}", testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuiteById(testSuiteId);

        this.validateQuestionMetadata(request.type(), request.metadata());

        QuestionEntity question = this.toEntity(request, null);
        question.setTestSuite(testSuite);
        QuestionEntity savedEntity = questionRepository.save(question);

        return ApiRes.created("Question created successfully", this.toViewModel(savedEntity));
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "questions", key = "#testSuiteId + ':' + #questionId"),
                @CacheEvict(value = "questions", key = "#testSuiteId + ':all'")
            })
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(UUID testSuiteId, UUID questionId, QuestionReq request) {
        log.info("Updating question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuiteById(testSuiteId);
        QuestionEntity existingQuestion =
                questionRepository
                        .findByIdAndTestSuite(questionId, testSuite)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Question not found with id: " + questionId));

        this.validateQuestionMetadata(request.type(), request.metadata());

        QuestionEntity updatedQuestion = this.toEntity(request, existingQuestion);
        questionRepository.save(updatedQuestion);

        return ApiRes.success("Question updated successfully");
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "questions", key = "#testSuiteId + ':' + #questionId"),
                @CacheEvict(value = "questions", key = "#testSuiteId + ':all'")
            })
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID testSuiteId, UUID questionId) {
        log.info("Deleting question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuiteById(testSuiteId);
        QuestionEntity question =
                questionRepository
                        .findByIdAndTestSuite(questionId, testSuite)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Question not found with id: " + questionId));

        question.setDeleted(true);
        questionRepository.save(question);

        return ApiRes.success("Question deleted successfully");
    }

    @Override
    @Cacheable(value = "questions", key = "#testSuiteId + ':' + #questionId")
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID testSuiteId, UUID questionId) {
        log.info("Fetching question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuiteById(testSuiteId);
        QuestionEntity question =
                questionRepository
                        .findByIdAndTestSuite(questionId, testSuite)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Question not found with id: " + questionId));

        return ApiRes.success("Question fetched successfully", this.toViewModel(question));
    }

    @Override
    @Cacheable(value = "questions", key = "#testSuiteId + ':all'")
    @CircuitBreaker(
            name = "questionServiceCircuitBreaker",
            fallbackMethod = "getAllByTestSuiteFallback")
    public ApiRes getAllByTestSuite(UUID testSuiteId) {
        log.info("Fetching all questions for test suite {}", testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuiteById(testSuiteId);
        List<QuestionEntity> questions = questionRepository.findAllByTestSuite(testSuite);
        List<QuestionRes> responses = questions.stream().map(this::toViewModel).toList();

        return ApiRes.success("Questions fetched successfully", responses);
    }

    void validateQuestionMetadata(QuestionType type, String metadata) {
        try {
            JsonNode jsonNode = objectMapper.readTree(metadata);

            switch (type) {
                case MULTIPLE_CHOICE, MULTIPLE_RESPONSE:
                    if (!jsonNode.has(METADATA_OPTIONS)
                            || !jsonNode.get(METADATA_OPTIONS).isArray()) {
                        throw new ValidationException(
                                "Multiple choice and multiple response questions must have"
                                        + " 'options' array in metadata");
                    }
                    if (!jsonNode.has(METADATA_CORRECT_INDICES)
                            || !jsonNode.get(METADATA_CORRECT_INDICES).isArray()) {
                        throw new ValidationException(
                                "Multiple choice and multiple response questions must have"
                                        + " 'correct_indices' array in metadata");
                    }
                    break;

                case TRUE_FALSE:
                    if (!jsonNode.has(METADATA_CORRECT_VALUE)
                            || !jsonNode.get(METADATA_CORRECT_VALUE).isBoolean()) {
                        throw new ValidationException(
                                "True/False questions must have 'correct_value' boolean in"
                                        + " metadata");
                    }
                    break;

                case FILL_IN_THE_BLANK:
                    if (!jsonNode.has(METADATA_ACCEPTED_ANSWERS)
                            || !jsonNode.get(METADATA_ACCEPTED_ANSWERS).isArray()) {
                        throw new ValidationException(
                                "Fill in the blank questions must have 'accepted_answers' array in"
                                        + " metadata");
                    }
                    if (jsonNode.get(METADATA_ACCEPTED_ANSWERS).size() == 0) {
                        throw new ValidationException(
                                "Fill in the blank questions must have at least one accepted"
                                        + " answer");
                    }
                    break;

                case MATCHING:
                    if (!jsonNode.has(METADATA_PAIRS) || !jsonNode.get(METADATA_PAIRS).isArray()) {
                        throw new ValidationException(
                                "Matching questions must have 'pairs' array in metadata");
                    }
                    break;

                case ORDERING:
                    if (!jsonNode.has(METADATA_CORRECT_ORDER)
                            || !jsonNode.get(METADATA_CORRECT_ORDER).isArray()) {
                        throw new ValidationException(
                                "Ordering questions must have 'correct_order' array in metadata");
                    }
                    break;
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new ValidationException("Invalid JSON format in metadata: " + e.getMessage());
        }
    }

    QuestionEntity toEntity(@NonNull QuestionReq from, QuestionEntity to) {
        if (to == null) {
            return QuestionEntity.builder()
                    .text(from.text())
                    .type(from.type())
                    .metadata(from.metadata())
                    .build();
        }

        to.setText(from.text());
        to.setType(from.type());
        to.setMetadata(from.metadata());
        return to;
    }

    QuestionRes toViewModel(QuestionEntity from) {
        return new QuestionRes(from.getId(), from.getText(), from.getType(), from.getMetadata());
    }

    private TestSuiteEntity findTestSuiteById(UUID testSuiteId) {
        return testSuiteRepository
                .findById(testSuiteId)
                .filter(ts -> !ts.getDeleted())
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Test suite not found with id: " + testSuiteId));
    }

    // Fallback methods for Circuit Breaker
    public ApiRes createFallback(UUID testSuiteId, QuestionReq request, Throwable t) {
        log.error("Question service unavailable during create: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes updateFallback(
            UUID testSuiteId, UUID questionId, QuestionReq request, Throwable t) {
        log.error("Question service unavailable during update: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes deleteFallback(UUID testSuiteId, UUID questionId, Throwable t) {
        log.error("Question service unavailable during delete: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes getByIdFallback(UUID testSuiteId, UUID questionId, Throwable t) {
        log.error("Question service unavailable during getById: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes getAllByTestSuiteFallback(UUID testSuiteId, Throwable t) {
        log.error("Question service unavailable during getAllByTestSuite: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    private RuntimeException unwrapQuestionException(Throwable t) {
        if (t instanceof NotFoundException nfe) {
            return nfe;
        }
        if (t instanceof ValidationException ve) {
            return ve;
        }
        if (t instanceof UnauthenticatedException ue) {
            return ue;
        }
        return new RetryLaterException(
                "Question service is currently unavailable. Please try again later.", t);
    }
}
