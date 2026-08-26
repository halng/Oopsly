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

package com.app.oopsly.api.ai.domain;

/** Prompt template and defaults of the AI generation context. */
public final class AiPrompts {

    private AiPrompts() {}

    public static final int DEFAULT_CARD_COUNT = 5;
    public static final String DEFAULT_TOPIC = "General";

    public static final String FLASHCARD_PROMPT_TEMPLATE =
            """
            You are an expert cognitive tutor specializing in active recall flashcards following \
            the FSRS algorithm.
            Generate %d high-yield, concise flashcards based on the following topic or notes:
            Topic: %s
            Notes/Context: %s

            Respond ONLY with a valid JSON array of objects with the following format:
            [
              {
                "front": "Clear question or prompt testing a single atomic concept",
                "back": "Concise, precise explanation or definition",
                "hint": "Brief memory trigger or clue",
                "tags": ["tag1", "tag2"]
              }
            ]
            No markdown wrapping, no code block backticks, just raw JSON.""";

    public static String buildPrompt(int count, String topic, String notes) {
        return String.format(
                FLASHCARD_PROMPT_TEMPLATE,
                count,
                topic == null || topic.isBlank() ? DEFAULT_TOPIC : topic,
                notes == null ? "" : notes);
    }
}
