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

package com.app.oopsly.api.unit.shared.util;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.shared.util.AnswerMatcher;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@DisplayName("AnswerMatcher")
class AnswerMatcherTest {

    @Test
    void normalize_trimsCollapsesAndFoldsCase() {
        assertEquals("new york", AnswerMatcher.normalize("  New   York ", false));
        assertEquals("New York", AnswerMatcher.normalize("  New \t York ", true));
        assertEquals("", AnswerMatcher.normalize(null, false));
    }

    @ParameterizedTest
    @CsvSource({
        "paris, Paris, false, true",
        "' PARIS ', Paris, false, true",
        "paris, Paris, true, false",
        "Paris, Paris, true, true",
        "mitocondria, mitochondria, false, true",
        "mitochondriaa, mitochondria, false, true",
        "mitokondrya, mitochondria, false, false",
        "cat, car, false, false",
        "Parsi, Paris, false, false",
        "'', Paris, false, false"
    })
    void matches_appliesNormalizationAndTypoTolerance(
            String input, String accepted, boolean caseSensitive, boolean expected) {
        assertEquals(expected, AnswerMatcher.matches(input, List.of(accepted), caseSensitive));
    }

    @Test
    void matches_acceptsAnyOfSeveralAnswers_andSkipsBlankCandidates() {
        assertTrue(
                AnswerMatcher.matches(
                        "USA", Arrays.asList(" ", null, "United States", "usa"), false));
    }

    @Test
    void matches_falseForMissingInputOrAnswers() {
        assertFalse(AnswerMatcher.matches(null, List.of("a"), false));
        assertFalse(AnswerMatcher.matches("a", List.of(), false));
        assertFalse(AnswerMatcher.matches("a", null, false));
    }

    @Test
    void matches_rejectsAnswersThatExceedTheLengthLimit() {
        String maximumLength = "a".repeat(AnswerMatcher.MAX_ANSWER_LENGTH);
        String oversized = "a".repeat(AnswerMatcher.MAX_ANSWER_LENGTH + 1);

        assertEquals(100, AnswerMatcher.MAX_ANSWER_LENGTH);
        assertTrue(AnswerMatcher.matches(maximumLength, List.of(maximumLength), false));
        assertFalse(AnswerMatcher.matches(oversized, List.of(oversized), false));
        assertFalse(AnswerMatcher.matches("answer", List.of(oversized), false));
    }

    @Test
    void levenshtein_countsEdits() {
        assertEquals(0, AnswerMatcher.levenshtein("abc", "abc"));
        assertEquals(3, AnswerMatcher.levenshtein("", "abc"));
        assertEquals(1, AnswerMatcher.levenshtein("abc", "abd"));
        assertEquals(3, AnswerMatcher.levenshtein("kitten", "sitting"));
    }

    @Test
    void constructorIsPrivate() throws Exception {
        Constructor<AnswerMatcher> constructor = AnswerMatcher.class.getDeclaredConstructor();
        assertTrue(Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        assertNotNull(constructor.newInstance());
    }
}
