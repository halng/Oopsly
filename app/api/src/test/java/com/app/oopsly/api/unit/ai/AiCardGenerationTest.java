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

package com.app.oopsly.api.unit.ai;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.ai.application.AiCardGenerationServiceImpl;
import com.app.oopsly.api.ai.application.vm.GenerateCardsReq;
import com.app.oopsly.api.ai.application.vm.GeneratedCard;
import com.app.oopsly.api.ai.domain.AiPrompts;
import com.app.oopsly.api.ai.infrastructure.AiCardGenerator;
import com.app.oopsly.api.ai.interfaces.rest.AiCardGenerationController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

class AiCardGenerationTest {

    // ------------------------------------------------------------ AiPrompts

    @Nested
    class AiPromptsTest {

        @Test
        void buildPrompt_includesCountTopicAndNotes() {
            String prompt = AiPrompts.buildPrompt(7, "Kanji", "Chapter 3 notes");

            assertTrue(prompt.contains("Generate 7 high-yield"));
            assertTrue(prompt.contains("Topic: Kanji"));
            assertTrue(prompt.contains("Notes/Context: Chapter 3 notes"));
            assertTrue(prompt.contains("valid JSON array"));
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        void buildPrompt_blankTopicFallsBackToDefault(String topic) {
            assertTrue(
                    AiPrompts.buildPrompt(AiPrompts.DEFAULT_CARD_COUNT, topic, "notes")
                            .contains("Topic: " + AiPrompts.DEFAULT_TOPIC));
        }

        @Test
        void buildPrompt_nullNotesBecomesEmptyString() {
            assertTrue(AiPrompts.buildPrompt(3, "Algebra", null).contains("Notes/Context: \n"));
        }

        @Test
        void utilityClass_hasPrivateConstructor() throws Exception {
            Constructor<AiPrompts> constructor = AiPrompts.class.getDeclaredConstructor();
            assertTrue(Modifier.isPrivate(constructor.getModifiers()));
            constructor.setAccessible(true);
            assertNotNull(constructor.newInstance());
        }
    }

    // ------------------------------------------------------- AiCardGenerator

    @Nested
    class AiCardGeneratorTest {

        private ObjectMapper objectMapper;

        @BeforeEach
        void setUp() {
            objectMapper = new ObjectMapper();
        }

        private AiCardGenerator generator(boolean enabled, String apiKey, String providerResponse) {
            AiCardGenerator generator =
                    new AiCardGenerator(objectMapper) {
                        @Override
                        protected String callProvider(String prompt) {
                            if (providerResponse == null) {
                                throw new IllegalStateException("provider exploded");
                            }
                            return providerResponse;
                        }
                    };
            ReflectionTestUtils.setField(generator, "enabled", enabled);
            ReflectionTestUtils.setField(generator, "apiKey", apiKey);
            return generator;
        }

        @Test
        void generate_whenDisabledUsesHeuristicCards() {
            List<GeneratedCard> cards = generator(false, "key", "[]").generate("Physics", null, 5);

            assertEquals(3, cards.size());
            assertTrue(cards.get(0).front().contains("Physics"));
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"  "})
        void generate_withoutApiKeyUsesHeuristicCards(String apiKey) {
            assertEquals(3, generator(true, apiKey, "[]").generate("Physics", null, 5).size());
        }

        @Test
        void generate_parsesProviderJson() {
            String json = "[{\"front\":\"Q1\",\"back\":\"A1\",\"hint\":\"H1\",\"tags\":[\"t1\"]}]";

            List<GeneratedCard> cards = generator(true, "key", json).generate("Physics", "n", 1);

            assertEquals(1, cards.size());
            assertEquals("Q1", cards.get(0).front());
            assertEquals("A1", cards.get(0).back());
            assertEquals(List.of("t1"), cards.get(0).tags());
        }

        @Test
        void generate_stripsMarkdownCodeFences() {
            String json =
                    "```json\n[{\"front\":\"Q\",\"back\":\"A\",\"hint\":null,\"tags\":[]}]\n```";

            List<GeneratedCard> cards = generator(true, "key", json).generate("Physics", "n", 1);

            assertEquals(1, cards.size());
            assertEquals("Q", cards.get(0).front());
        }

        @Test
        void generate_invalidJsonIsTranslatedToRetryLater() {
            AiCardGenerator generator = generator(true, "key", "not json at all");

            assertThrows(
                    RetryLaterException.class, () -> generator.generate("Physics", "notes", 5));
        }

        @Test
        void generate_providerFailureIsTranslatedToRetryLater() {
            AiCardGenerator generator = generator(true, "key", null);

            RetryLaterException exception =
                    assertThrows(
                            RetryLaterException.class,
                            () -> generator.generate("Physics", "notes", 5));
            assertNotNull(exception.getMessage());
        }

        @Test
        void defaultCallProvider_isNotConfigured() {
            AiCardGenerator generator = new AiCardGenerator(objectMapper);
            ReflectionTestUtils.setField(generator, "enabled", true);
            ReflectionTestUtils.setField(generator, "apiKey", "key");

            assertThrows(RetryLaterException.class, () -> generator.generate("Topic", null, 3));
        }

        @Test
        void heuristicCards_areDeterministicAndTagged() {
            AiCardGenerator generator = new AiCardGenerator(objectMapper);

            List<GeneratedCard> first = generator.heuristicCards("Machine Learning");
            List<GeneratedCard> second = generator.heuristicCards("Machine Learning");

            assertEquals(first, second);
            assertEquals(List.of("machine-learning"), first.get(0).tags());
            assertEquals(3, first.size());
            first.forEach(
                    card -> {
                        assertNotNull(card.front());
                        assertNotNull(card.back());
                        assertNotNull(card.hint());
                    });
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   "})
        void heuristicCards_blankTopicUsesGenericSubject(String topic) {
            List<GeneratedCard> cards = new AiCardGenerator(objectMapper).heuristicCards(topic);

            assertTrue(cards.get(0).front().contains("this subject"));
        }
    }

    // ------------------------------------------- AiCardGenerationServiceImpl

    @Nested
    @ExtendWith(MockitoExtension.class)
    class ServiceTest {

        @Mock private AiCardGenerator aiCardGenerator;

        private AiCardGenerationServiceImpl service;

        @BeforeEach
        void setUp() {
            service = new AiCardGenerationServiceImpl(aiCardGenerator);
        }

        @SuppressWarnings("unchecked")
        private List<GeneratedCard> dataOf(ApiRes response) {
            return (List<GeneratedCard>) response.getBody().data();
        }

        private Object invokeFallback(GenerateCardsReq request, Throwable throwable)
                throws Exception {
            Method method =
                    AiCardGenerationServiceImpl.class.getDeclaredMethod(
                            "generateCardsFallback", GenerateCardsReq.class, Throwable.class);
            method.setAccessible(true);
            try {
                return method.invoke(service, request, throwable);
            } catch (InvocationTargetException e) {
                throw (Exception) e.getCause();
            }
        }

        @Test
        void generateCards_withTopicUsesDefaultCount() {
            GeneratedCard card = new GeneratedCard("f", "b", "h", List.of());
            when(aiCardGenerator.generate("Kanji", null, AiPrompts.DEFAULT_CARD_COUNT))
                    .thenReturn(List.of(card));

            ApiRes response = service.generateCards(new GenerateCardsReq("Kanji", null, null));

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getBody().isSuccess());
            assertEquals(List.of(card), dataOf(response));
        }

        @Test
        void generateCards_withExplicitCountIsForwarded() {
            when(aiCardGenerator.generate("Kanji", "notes", 42)).thenReturn(List.of());

            service.generateCards(new GenerateCardsReq("Kanji", "notes", 42));

            verify(aiCardGenerator).generate("Kanji", "notes", 42);
        }

        @Test
        void generateCards_worksWithNotesOnly() {
            when(aiCardGenerator.generate(nullable(String.class), anyString(), anyInt()))
                    .thenReturn(List.of());

            assertEquals(
                    HttpStatus.OK,
                    service.generateCards(new GenerateCardsReq(null, "raw notes", null))
                            .getStatusCode());
        }

        @Test
        void generateCards_withoutTopicAndNotesIsRejected() {
            assertThrows(
                    ValidationException.class,
                    () -> service.generateCards(new GenerateCardsReq(null, null, null)));
            assertThrows(
                    ValidationException.class,
                    () -> service.generateCards(new GenerateCardsReq("  ", "   ", 5)));
            verifyNoInteractions(aiCardGenerator);
        }

        @Test
        void fallback_rethrowsValidationException() {
            assertThrows(
                    ValidationException.class,
                    () ->
                            invokeFallback(
                                    new GenerateCardsReq("a", null, null),
                                    new ValidationException("bad")));
        }

        @Test
        void fallback_returnsHeuristicDeckOnProviderOutage() throws Exception {
            GeneratedCard card = new GeneratedCard("f", "b", "h", List.of());
            when(aiCardGenerator.heuristicCards("Kanji")).thenReturn(List.of(card));

            ApiRes response =
                    (ApiRes)
                            invokeFallback(
                                    new GenerateCardsReq("Kanji", null, null),
                                    new RetryLaterException("down"));

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getBody().isSuccess());
            assertEquals(List.of(card), dataOf(response));
        }

        @Test
        void fallback_handlesNullRequest() throws Exception {
            when(aiCardGenerator.heuristicCards(null)).thenReturn(List.of());

            ApiRes response = (ApiRes) invokeFallback(null, new IllegalStateException("boom"));

            assertTrue(response.getBody().isSuccess());
        }
    }

    // ------------------------------------------------------------ controller

    @Nested
    @ExtendWith(MockitoExtension.class)
    class ControllerTest {

        @Mock
        private com.app.oopsly.api.ai.application.AiCardGenerationService aiCardGenerationService;

        @Test
        void generateCards_delegatesToService() {
            AiCardGenerationController controller =
                    new AiCardGenerationController(aiCardGenerationService);
            GenerateCardsReq request = new GenerateCardsReq("Kanji", null, 5);
            ApiRes expected = ApiRes.success("ok");
            when(aiCardGenerationService.generateCards(request)).thenReturn(expected);

            assertSame(expected, controller.generateCards(request));
        }

        @Test
        void generateCards_propagatesValidationErrors() {
            AiCardGenerationController controller =
                    new AiCardGenerationController(aiCardGenerationService);
            GenerateCardsReq request = new GenerateCardsReq(null, null, null);
            when(aiCardGenerationService.generateCards(request))
                    .thenThrow(new ValidationException("topic required"));

            assertThrows(ValidationException.class, () -> controller.generateCards(request));
        }
    }
}
