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

import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.testsuite.domain.QuestionMetadata;
import com.app.oopsly.api.testsuite.domain.QuestionValidator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Reads and writes the question metadata JSON column. */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuestionMetadataMapper {

    private static final String LEGACY_CORRECT_VALUE_KEY = "correct_value";

    private final ObjectMapper objectMapper;

    public String write(QuestionMetadata metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            throw new ValidationException(
                    "Unable to serialize question metadata: " + exception.getMessage());
        }
    }

    /** Lenient read; also understands the legacy snake_case keys written before V25. */
    public QuestionMetadata read(String raw) {
        if (raw == null || raw.isBlank()) {
            return QuestionMetadata.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            List<String> options = textList(node, "options");
            List<Integer> indexes = intList(node, "correctOptionIndexes");
            if (indexes == null) {
                indexes = intList(node, "correct_indices");
            }
            Integer index = intValue(node, "correctOptionIndex");
            if (index == null && indexes != null && indexes.size() == 1) {
                index = indexes.get(0);
            }
            if (node.hasNonNull(LEGACY_CORRECT_VALUE_KEY)) {
                if (index == null) {
                    index = node.get(LEGACY_CORRECT_VALUE_KEY).asBoolean() ? 0 : 1;
                }
                if (options == null || options.isEmpty()) {
                    options = QuestionValidator.TRUE_FALSE_OPTIONS;
                }
            }
            List<String> accepted = textList(node, "acceptedAnswers");
            if (accepted == null) {
                accepted = textList(node, "accepted_answers");
            }
            Boolean caseSensitive =
                    node.hasNonNull("caseSensitive") ? node.get("caseSensitive").asBoolean() : null;
            String explanation =
                    node.hasNonNull("explanation") ? node.get("explanation").asText() : null;
            return new QuestionMetadata(
                    options == null ? List.of() : options,
                    index,
                    indexes,
                    accepted,
                    caseSensitive,
                    explanation);
        } catch (Exception exception) {
            log.warn("Unable to parse question metadata: {}", exception.getMessage());
            return QuestionMetadata.empty();
        }
    }

    private static Integer intValue(JsonNode node, String field) {
        return node.hasNonNull(field) && node.get(field).canConvertToInt()
                ? node.get(field).asInt()
                : null;
    }

    private static List<Integer> intList(JsonNode node, String field) {
        if (!node.has(field) || !node.get(field).isArray()) {
            return null;
        }
        List<Integer> values = new ArrayList<>();
        node.get(field).forEach(item -> values.add(item.asInt()));
        return values;
    }

    private static List<String> textList(JsonNode node, String field) {
        if (!node.has(field) || !node.get(field).isArray()) {
            return null;
        }
        List<String> values = new ArrayList<>();
        node.get(field).forEach(item -> values.add(item.asText()));
        return values;
    }
}
