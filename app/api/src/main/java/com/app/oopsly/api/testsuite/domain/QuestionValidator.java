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

package com.app.oopsly.api.testsuite.domain;

import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.AnswerMatcher;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.TreeSet;

/** Validates a question per type and returns the normalized metadata to persist. */
public final class QuestionValidator {

    public static final String BLANK_MARKER = "___";
    public static final int MIN_OPTIONS = 2;
    public static final int MAX_OPTIONS = 6;
    public static final List<String> TRUE_FALSE_OPTIONS = List.of("True", "False");

    private QuestionValidator() {}

    public static QuestionMetadata validate(
            String text, QuestionType type, QuestionMetadata input) {
        if (text == null || text.isBlank()) {
            throw new ValidationException("Question text is required");
        }
        if (type == null) {
            throw new ValidationException("Question type is required");
        }
        QuestionMetadata data = input == null ? QuestionMetadata.empty() : input;
        String explanation = trimToNull(data.explanation());

        return switch (type) {
            case SINGLE_CHOICE -> {
                List<String> options = validateOptions(data.options());
                Integer index = data.correctOptionIndex();
                if (index == null) {
                    throw new ValidationException(
                            "Single choice questions need a correct option index");
                }
                requireInRange(index, options.size());
                yield new QuestionMetadata(options, index, null, null, null, explanation);
            }
            case MULTIPLE_CHOICE -> {
                List<String> options = validateOptions(data.options());
                List<Integer> indexes = data.correctOptionIndexesOrEmpty();
                if (indexes.isEmpty()) {
                    throw new ValidationException(
                            "Multiple choice questions need at least one correct option");
                }
                TreeSet<Integer> unique = new TreeSet<>();
                for (Integer index : indexes) {
                    if (index == null) {
                        throw new ValidationException("Correct option indexes cannot be null");
                    }
                    requireInRange(index, options.size());
                    unique.add(index);
                }
                yield new QuestionMetadata(
                        options, null, new ArrayList<>(unique), null, null, explanation);
            }
            case TRUE_FALSE -> {
                Integer index = data.correctOptionIndex();
                if (index == null || (index != 0 && index != 1)) {
                    throw new ValidationException(
                            "True/False questions need a correct option index of 0 (True) or 1"
                                    + " (False)");
                }
                yield new QuestionMetadata(
                        TRUE_FALSE_OPTIONS, index, null, null, null, explanation);
            }
            case FILL_IN_THE_BLANK -> {
                if (!text.contains(BLANK_MARKER)) {
                    throw new ValidationException(
                            "Fill in the blank questions must contain a blank marker ("
                                    + BLANK_MARKER
                                    + ")");
                }
                List<String> accepted =
                        data.acceptedAnswersOrEmpty().stream()
                                .filter(Objects::nonNull)
                                .map(String::trim)
                                .filter(answer -> !answer.isEmpty())
                                .map(
                                        answer -> {
                                            if (answer.length()
                                                    > AnswerMatcher.MAX_ANSWER_LENGTH) {
                                                throw new ValidationException(
                                                        "Accepted answers cannot exceed "
                                                                + AnswerMatcher.MAX_ANSWER_LENGTH
                                                                + " characters");
                                            }
                                            return answer;
                                        })
                                .distinct()
                                .toList();
                if (accepted.isEmpty()) {
                    throw new ValidationException(
                            "Fill in the blank questions need at least one accepted answer");
                }
                yield new QuestionMetadata(
                        null, null, null, accepted, data.caseSensitiveOrFalse(), explanation);
            }
            case MATCHING, ORDERING -> throw new ValidationException(
                    "Question type " + type + " is not supported yet");
        };
    }

    private static List<String> validateOptions(List<String> raw) {
        if (raw == null || raw.size() < MIN_OPTIONS || raw.size() > MAX_OPTIONS) {
            throw new ValidationException(
                    "Choice questions need between "
                            + MIN_OPTIONS
                            + " and "
                            + MAX_OPTIONS
                            + " options");
        }
        List<String> options = new ArrayList<>(raw.size());
        for (String option : raw) {
            if (option == null || option.isBlank()) {
                throw new ValidationException("Options cannot be blank");
            }
            options.add(option.trim());
        }
        return options;
    }

    private static void requireInRange(int index, int size) {
        if (index < 0 || index >= size) {
            throw new ValidationException(
                    "Correct option index " + index + " does not match any option");
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
