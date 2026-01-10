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

import com.app.oopsly.api.entity.Question;
import com.app.oopsly.api.entity.TestSuite;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.QuestionRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.QuestionService;
import com.app.oopsly.api.util.QuestionType;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import com.app.oopsly.api.viewmodel.QuestionRes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ApiRes create(UUID testSuiteId, QuestionReq request) {
        log.info("Creating question for test suite {}", testSuiteId);
        TestSuite testSuite = this.findTestSuiteById(testSuiteId);

        this.validateQuestionMetadata(request.type(), request.metadata());

        Question question = this.toEntity(request, null);
        question.setTestSuite(testSuite);
        Question savedEntity = questionRepository.save(question);

        return ApiRes.created("Question created successfully", this.toViewModel(savedEntity));
    }

    @Override
    public ApiRes update(UUID testSuiteId, UUID questionId, QuestionReq request) {
        log.info("Updating question {} for test suite {}", questionId, testSuiteId);
        TestSuite testSuite = this.findTestSuiteById(testSuiteId);
        Question existingQuestion =
                questionRepository
                        .findByIdAndTestSuite(questionId, testSuite)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Question not found with id: " + questionId));

        this.validateQuestionMetadata(request.type(), request.metadata());

        Question updatedQuestion = this.toEntity(request, existingQuestion);
        questionRepository.save(updatedQuestion);

        return ApiRes.success("Question updated successfully");
    }

    @Override
    public ApiRes delete(UUID testSuiteId, UUID questionId) {
        log.info("Deleting question {} for test suite {}", questionId, testSuiteId);
        TestSuite testSuite = this.findTestSuiteById(testSuiteId);
        Question question =
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
    public ApiRes getById(UUID testSuiteId, UUID questionId) {
        log.info("Fetching question {} for test suite {}", questionId, testSuiteId);
        TestSuite testSuite = this.findTestSuiteById(testSuiteId);
        Question question =
                questionRepository
                        .findByIdAndTestSuite(questionId, testSuite)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Question not found with id: " + questionId));

        return ApiRes.success("Question fetched successfully", this.toViewModel(question));
    }

    @Override
    public ApiRes getAllByTestSuite(UUID testSuiteId) {
        log.info("Fetching all questions for test suite {}", testSuiteId);
        TestSuite testSuite = this.findTestSuiteById(testSuiteId);
        List<Question> questions = questionRepository.findAllByTestSuite(testSuite);
        List<QuestionRes> responses = questions.stream().map(this::toViewModel).toList();

        return ApiRes.success("Questions fetched successfully", responses);
    }

    void validateQuestionMetadata(QuestionType type, String metadata) {
        try {
            JsonNode jsonNode = objectMapper.readTree(metadata);

            switch (type) {
                case MULTIPLE_CHOICE, SINGLE_CHOICE:
                    if (!jsonNode.has("options") || !jsonNode.get("options").isArray()) {
                        throw new ValidationException(
                                "Multiple choice and single choice questions must have 'options'"
                                        + " array in metadata");
                    }
                    if (!jsonNode.has("correct_indices")
                            || !jsonNode.get("correct_indices").isArray()) {
                        throw new ValidationException(
                                "Multiple choice and single choice questions must have"
                                        + " 'correct_indices' array in metadata");
                    }
                    break;

                case TRUE_FALSE:
                    if (!jsonNode.has("correct_value")
                            || !jsonNode.get("correct_value").isBoolean()) {
                        throw new ValidationException(
                                "True/False questions must have 'correct_value' boolean in"
                                        + " metadata");
                    }
                    break;

                case FILL_BLANK:
                    if (!jsonNode.has("accepted_answers")
                            || !jsonNode.get("accepted_answers").isArray()) {
                        throw new ValidationException(
                                "Fill in the blank questions must have 'accepted_answers' array in"
                                        + " metadata");
                    }
                    if (jsonNode.get("accepted_answers").size() == 0) {
                        throw new ValidationException(
                                "Fill in the blank questions must have at least one accepted"
                                        + " answer");
                    }
                    break;
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new ValidationException("Invalid JSON format in metadata: " + e.getMessage());
        }
    }

    Question toEntity(@NonNull QuestionReq from, Question to) {
        if (to == null) {
            return Question.builder()
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

    QuestionRes toViewModel(Question from) {
        return new QuestionRes(from.getId(), from.getText(), from.getType(), from.getMetadata());
    }

    private TestSuite findTestSuiteById(UUID testSuiteId) {
        return testSuiteRepository
                .findById(testSuiteId)
                .filter(ts -> !ts.getDeleted())
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Test suite not found with id: " + testSuiteId));
    }
}
