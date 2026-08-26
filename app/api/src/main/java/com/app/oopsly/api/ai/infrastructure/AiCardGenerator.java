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

package com.app.oopsly.api.ai.infrastructure;

import com.app.oopsly.api.ai.application.vm.GeneratedCard;
import com.app.oopsly.api.ai.domain.AiPrompts;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Adapter towards the generative AI provider. When no API key is configured the heuristic generator
 * is used so the feature keeps working in local and demo environments.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiCardGenerator {

    private static final String JSON_FENCE = "```json";
    private static final String FENCE = "```";

    private final ObjectMapper objectMapper;

    @Value("${app.ai.api-key:}")
    private String apiKey;

    @Value("${app.ai.enabled:false}")
    private boolean enabled;

    public List<GeneratedCard> generate(String topic, String notes, int count) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            log.info("AI provider disabled, using heuristic flashcard generation");
            return heuristicCards(topic);
        }
        try {
            String rawJson = callProvider(AiPrompts.buildPrompt(count, topic, notes));
            String cleaned = rawJson.replace(JSON_FENCE, "").replace(FENCE, "").trim();
            return objectMapper.readValue(cleaned, new TypeReference<List<GeneratedCard>>() {});
        } catch (Exception exception) {
            log.error("AI provider call failed", exception);
            throw new RetryLaterException(ApiMessages.AI_UNAVAILABLE, exception);
        }
    }

    /** Deterministic fallback deck, mirrors the heuristic generator used by the UI mock server. */
    public List<GeneratedCard> heuristicCards(String topic) {
        String subject = topic == null || topic.isBlank() ? "this subject" : topic;
        String slug = subject.toLowerCase(Locale.ENGLISH).replaceAll("\\s+", "-");

        return List.of(
                new GeneratedCard(
                        "What is the core principle of " + subject + "?",
                        "The fundamental concept focuses on foundational mechanisms, input/output"
                                + " relationships, and structural properties.",
                        "Key definition & mechanism",
                        List.of(slug)),
                new GeneratedCard(
                        "What are the primary advantages and trade-offs of " + subject + "?",
                        "Provides high performance, modularity, and predictability, but requires"
                                + " careful consideration of edge cases and complexity.",
                        "Compare pros and cons",
                        List.of("trade-offs", "analysis")),
                new GeneratedCard(
                        "How do you apply active recall and spaced repetition to " + subject + "?",
                        "By repeatedly retrieving concepts from memory at expanding intervals based"
                                + " on the FSRS retention probability model.",
                        "Testing effect + expanding intervals",
                        List.of("spaced-repetition")));
    }

    /**
     * Hook for the concrete provider SDK call. Kept isolated so the provider can be swapped without
     * touching the application layer.
     */
    protected String callProvider(String prompt) {
        throw new UnsupportedOperationException(ApiMessages.AI_PROVIDER_NOT_CONFIGURED);
    }
}
