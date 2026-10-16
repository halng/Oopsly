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

package com.app.oopsly.api.unit.testsuite.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.testsuite.domain.QuestionMetadata;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.domain.QuestionValidator;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("QuestionValidator")
class QuestionValidatorTest {

    private static QuestionMetadata choice(
            List<String> options, Integer index, List<Integer> indexes) {
        return new QuestionMetadata(options, index, indexes, null, null, null);
    }

    private static String messageOf(Runnable action) {
        return assertThrows(ValidationException.class, action::run).getMessage();
    }

    @Test
    void rejectsBlankTextAndMissingType() {
        assertTrue(
                messageOf(() -> QuestionValidator.validate(" ", QuestionType.TRUE_FALSE, null))
                        .contains("text"));
        assertTrue(messageOf(() -> QuestionValidator.validate("q", null, null)).contains("type"));
    }

    @ParameterizedTest
    @EnumSource(
            value = QuestionType.class,
            names = {"MATCHING", "ORDERING"})
    void rejectsUnsupportedTypes(QuestionType type) {
        assertTrue(
                messageOf(() -> QuestionValidator.validate("q", type, QuestionMetadata.empty()))
                        .contains("not supported"));
    }

    @Nested
    class SingleChoice {

        @Test
        void normalizesOptionsAndDropsUnrelatedFields() {
            QuestionMetadata input =
                    new QuestionMetadata(
                            List.of(" a ", "b"), 1, List.of(0), List.of("x"), true, "  ");

            QuestionMetadata out =
                    QuestionValidator.validate("q", QuestionType.SINGLE_CHOICE, input);

            assertEquals(List.of("a", "b"), out.options());
            assertEquals(1, out.correctOptionIndex());
            assertNull(out.correctOptionIndexes());
            assertNull(out.acceptedAnswers());
            assertNull(out.caseSensitive());
            assertNull(out.explanation());
        }

        @Test
        void rejectsTooFewOrTooManyOptions() {
            assertTrue(
                    messageOf(
                                    () ->
                                            QuestionValidator.validate(
                                                    "q",
                                                    QuestionType.SINGLE_CHOICE,
                                                    choice(List.of("a"), 0, null)))
                            .contains("between 2 and 6"));
            List<String> seven = List.of("1", "2", "3", "4", "5", "6", "7");
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q", QuestionType.SINGLE_CHOICE, choice(seven, 0, null)));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q", QuestionType.SINGLE_CHOICE, choice(null, 0, null)));
        }

        @Test
        void rejectsBlankOrNullOption() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.SINGLE_CHOICE,
                                    choice(List.of("a", " "), 0, null)));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.SINGLE_CHOICE,
                                    choice(Arrays.asList("a", null), 0, null)));
        }

        @ParameterizedTest
        @ValueSource(ints = {-1, 2})
        void rejectsIndexOutOfRange(int index) {
            assertTrue(
                    messageOf(
                                    () ->
                                            QuestionValidator.validate(
                                                    "q",
                                                    QuestionType.SINGLE_CHOICE,
                                                    choice(List.of("a", "b"), index, null)))
                            .contains("does not match"));
        }

        @Test
        void rejectsMissingIndex() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.SINGLE_CHOICE,
                                    choice(List.of("a", "b"), null, null)));
        }
    }

    @Nested
    class MultipleChoice {

        @Test
        void dedupesAndSortsCorrectIndexes() {
            QuestionMetadata out =
                    QuestionValidator.validate(
                            "q",
                            QuestionType.MULTIPLE_CHOICE,
                            choice(List.of("a", "b", "c"), 2, List.of(2, 0, 2)));

            assertEquals(List.of(0, 2), out.correctOptionIndexes());
            assertNull(out.correctOptionIndex());
        }

        @Test
        void requiresAtLeastOneCorrectOption() {
            assertTrue(
                    messageOf(
                                    () ->
                                            QuestionValidator.validate(
                                                    "q",
                                                    QuestionType.MULTIPLE_CHOICE,
                                                    choice(List.of("a", "b"), null, List.of())))
                            .contains("at least one"));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.MULTIPLE_CHOICE,
                                    choice(List.of("a", "b"), null, null)));
        }

        @Test
        void rejectsNullOrOutOfRangeIndexes() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.MULTIPLE_CHOICE,
                                    choice(List.of("a", "b"), null, Arrays.asList(0, null))));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q",
                                    QuestionType.MULTIPLE_CHOICE,
                                    choice(List.of("a", "b"), null, List.of(0, 5))));
        }
    }

    @Nested
    class TrueFalse {

        @ParameterizedTest
        @ValueSource(ints = {0, 1})
        void forcesTrueFalseOptions(int index) {
            QuestionMetadata out =
                    QuestionValidator.validate(
                            "q",
                            QuestionType.TRUE_FALSE,
                            choice(List.of("yes", "no", "maybe"), index, null));

            assertEquals(QuestionValidator.TRUE_FALSE_OPTIONS, out.options());
            assertEquals(index, out.correctOptionIndex());
        }

        @Test
        void rejectsOtherIndexes() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q", QuestionType.TRUE_FALSE, choice(null, 2, null)));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "q", QuestionType.TRUE_FALSE, choice(null, null, null)));
            assertThrows(
                    ValidationException.class,
                    () -> QuestionValidator.validate("q", QuestionType.TRUE_FALSE, null));
        }
    }

    @Nested
    class FillInTheBlank {

        @Test
        void trimsAnswers_dropsBlanks_andKeepsCaseFlag() {
            QuestionMetadata out =
                    QuestionValidator.validate(
                            "Capital: ___",
                            QuestionType.FILL_IN_THE_BLANK,
                            new QuestionMetadata(
                                    List.of("x", "y"),
                                    0,
                                    null,
                                    Arrays.asList(" Paris ", "", null, "Paris"),
                                    true,
                                    " because "));

            assertEquals(List.of("Paris"), out.acceptedAnswers());
            assertTrue(out.caseSensitive());
            assertEquals("because", out.explanation());
            assertNull(out.options());
            assertNull(out.correctOptionIndex());
        }

        @Test
        void defaultsCaseSensitiveToFalse() {
            QuestionMetadata out =
                    QuestionValidator.validate(
                            "___",
                            QuestionType.FILL_IN_THE_BLANK,
                            new QuestionMetadata(null, null, null, List.of("a"), null, null));

            assertFalse(out.caseSensitive());
        }

        @Test
        void requiresBlankMarker() {
            assertTrue(
                    messageOf(
                                    () ->
                                            QuestionValidator.validate(
                                                    "Capital of France",
                                                    QuestionType.FILL_IN_THE_BLANK,
                                                    new QuestionMetadata(
                                                            null,
                                                            null,
                                                            null,
                                                            List.of("Paris"),
                                                            null,
                                                            null)))
                            .contains("___"));
        }

        @Test
        void requiresANonBlankAcceptedAnswer() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "___",
                                    QuestionType.FILL_IN_THE_BLANK,
                                    new QuestionMetadata(
                                            null, null, null, List.of("  "), null, null)));
            assertThrows(
                    ValidationException.class,
                    () ->
                            QuestionValidator.validate(
                                    "___",
                                    QuestionType.FILL_IN_THE_BLANK,
                                    QuestionMetadata.empty()));
        }
    }

    @Test
    void constructorIsPrivate() throws Exception {
        Constructor<QuestionValidator> constructor =
                QuestionValidator.class.getDeclaredConstructor();
        assertTrue(Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        assertNotNull(constructor.newInstance());
    }
}
