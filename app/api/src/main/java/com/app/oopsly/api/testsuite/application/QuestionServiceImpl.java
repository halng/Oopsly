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

package com.app.oopsly.api.testsuite.application;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionRes;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.QuestionMetadata;
import com.app.oopsly.api.testsuite.domain.QuestionValidator;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.app.oopsly.api.user.UserService;
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

    private final QuestionRepository questionRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final ShelfRepository shelfRepository;
    private final QuestionMetadataMapper metadataMapper;
    private final UserService userService;

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "questions", key = "#testSuiteId + ':all'"),
                @CacheEvict(value = "testSuites", key = "#shelveId + ':all'"),
                @CacheEvict(value = "testSuites", key = "#shelveId + ':' + #testSuiteId")
            })
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID shelveId, UUID testSuiteId, QuestionReq request) {
        log.info("Creating question for test suite {}", testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuite(shelveId, testSuiteId);

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
    public ApiRes update(UUID shelveId, UUID testSuiteId, UUID questionId, QuestionReq request) {
        log.info("Updating question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuite(shelveId, testSuiteId);
        QuestionEntity existingQuestion = findQuestion(questionId, testSuite);

        QuestionEntity updatedQuestion = this.toEntity(request, existingQuestion);
        questionRepository.save(updatedQuestion);

        return ApiRes.success("Question updated successfully", this.toViewModel(updatedQuestion));
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "questions", key = "#testSuiteId + ':' + #questionId"),
                @CacheEvict(value = "questions", key = "#testSuiteId + ':all'"),
                @CacheEvict(value = "testSuites", key = "#shelveId + ':all'"),
                @CacheEvict(value = "testSuites", key = "#shelveId + ':' + #testSuiteId")
            })
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID shelveId, UUID testSuiteId, UUID questionId) {
        log.info("Deleting question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuite(shelveId, testSuiteId);
        QuestionEntity question = findQuestion(questionId, testSuite);

        question.setDeleted(true);
        questionRepository.save(question);

        return ApiRes.success("Question deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "questionServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID shelveId, UUID testSuiteId, UUID questionId) {
        log.info("Fetching question {} for test suite {}", questionId, testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuite(shelveId, testSuiteId);
        QuestionEntity question = findQuestion(questionId, testSuite);

        return ApiRes.success("Question fetched successfully", this.toViewModel(question));
    }

    @Override
    @Cacheable(value = "questions", key = "#testSuiteId + ':all'")
    @CircuitBreaker(
            name = "questionServiceCircuitBreaker",
            fallbackMethod = "getAllByTestSuiteFallback")
    public ApiRes getAllByTestSuite(UUID shelveId, UUID testSuiteId) {
        log.info("Fetching all questions for test suite {}", testSuiteId);
        TestSuiteEntity testSuite = this.findTestSuite(shelveId, testSuiteId);
        List<QuestionEntity> questions = questionRepository.findAllByTestSuite(testSuite);
        List<QuestionRes> responses = questions.stream().map(this::toViewModel).toList();

        return ApiRes.success("Questions fetched successfully", responses);
    }

    QuestionEntity toEntity(@NonNull QuestionReq from, QuestionEntity to) {
        QuestionMetadata metadata =
                QuestionValidator.validate(
                        from.text(),
                        from.type(),
                        new QuestionMetadata(
                                from.options(),
                                from.correctOptionIndex(),
                                from.correctOptionIndexes(),
                                from.acceptedAnswers(),
                                from.caseSensitive(),
                                from.explanation()));
        String json = metadataMapper.write(metadata);
        String text = from.text().trim();
        if (to == null) {
            return QuestionEntity.builder().text(text).type(from.type()).metadata(json).build();
        }

        to.setText(text);
        to.setType(from.type());
        to.setMetadata(json);
        return to;
    }

    QuestionRes toViewModel(QuestionEntity from) {
        QuestionMetadata metadata = metadataMapper.read(from.getMetadata());
        return new QuestionRes(
                from.getId(),
                from.getText(),
                from.getType(),
                metadata.options(),
                metadata.correctOptionIndex(),
                metadata.correctOptionIndexes(),
                metadata.acceptedAnswers(),
                metadata.caseSensitive(),
                metadata.explanation());
    }

    private QuestionEntity findQuestion(UUID questionId, TestSuiteEntity testSuite) {
        return questionRepository
                .findByIdAndTestSuite(questionId, testSuite)
                .orElseThrow(
                        () -> new NotFoundException("Question not found with id: " + questionId));
    }

    private TestSuiteEntity findTestSuite(UUID shelveId, UUID testSuiteId) {
        Shelf shelve =
                shelfRepository
                        .findByIdAndUser(shelveId, userService.getCurrentUser())
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Shelve not found with id: " + shelveId));
        return testSuiteRepository
                .findByIdAndShelve(testSuiteId, shelve)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Test suite not found with id: " + testSuiteId));
    }

    // Fallback methods for Circuit Breaker
    public ApiRes createFallback(
            UUID shelveId, UUID testSuiteId, QuestionReq request, Throwable t) {
        log.error("Question service unavailable during create: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes updateFallback(
            UUID shelveId, UUID testSuiteId, UUID questionId, QuestionReq request, Throwable t) {
        log.error("Question service unavailable during update: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes deleteFallback(UUID shelveId, UUID testSuiteId, UUID questionId, Throwable t) {
        log.error("Question service unavailable during delete: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes getByIdFallback(UUID shelveId, UUID testSuiteId, UUID questionId, Throwable t) {
        log.error("Question service unavailable during getById: {}", t.getMessage());
        throw unwrapQuestionException(t);
    }

    public ApiRes getAllByTestSuiteFallback(UUID shelveId, UUID testSuiteId, Throwable t) {
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
