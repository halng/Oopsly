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

package com.app.oopsly.api.integration;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import com.app.oopsly.api.integration.support.LibraryFixture;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

@DisplayName("QuestionController integration")
class QuestionControllerTest extends AbstractControllerTest {

    private static final String QUESTIONS = "/v1/shelves/{s}/test-suites/{t}/questions";
    private static final String QUESTION = QUESTIONS + "/{id}";

    private AuthSession session;
    private UUID shelfId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        shelfId = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken()).shelfId();
        testSuiteId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post("/v1/shelves/{s}/test-suites", shelfId)
                                                .with(bearer(session))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"title\":\"Q Suite\"}"))
                                .andExpect(status().isCreated())
                                .andReturn());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId)).andExpect(status().isUnauthorized());
    }

    @Test
    void create_list_get_update_delete() throws Exception {
        UUID questionId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post(QUESTIONS, shelfId, testSuiteId)
                                                .with(bearer(session))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        """
                                                        {"text":"2+2=?","type":"SINGLE_CHOICE",
                                                         "options":["3","4"],"correctOptionIndex":1}
                                                        """))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.data.type").value("SINGLE_CHOICE"))
                                .andExpect(jsonPath("$.data.options", hasSize(2)))
                                .andExpect(jsonPath("$.data.correctOptionIndex").value(1))
                                .andReturn());

        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId).with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        mockMvc.perform(get(QUESTION, shelfId, testSuiteId, questionId).with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(questionId.toString()));

        mockMvc.perform(
                        get(QUESTION, shelfId, testSuiteId, UUID.randomUUID())
                                .with(bearer(session)))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put(QUESTION, shelfId, testSuiteId, questionId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"text":"Earth is flat?","type":"TRUE_FALSE","correctOptionIndex":1}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("TRUE_FALSE"))
                .andExpect(jsonPath("$.data.options[1]").value("False"));

        mockMvc.perform(patch(QUESTION, shelfId, testSuiteId, questionId).with(bearer(session)))
                .andExpect(status().isOk());
        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId).with(bearer(session)))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void create_multipleChoiceAndFillInTheBlank() throws Exception {
        mockMvc.perform(
                        post(QUESTIONS, shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"text":"Primes","type":"MULTIPLE_CHOICE",
                                         "options":["2","3","4"],"correctOptionIndexes":[1,0]}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.correctOptionIndexes[0]").value(0))
                .andExpect(jsonPath("$.data.correctOptionIndexes[1]").value(1));

        mockMvc.perform(
                        post(QUESTIONS, shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"text":"H2___","type":"FILL_IN_THE_BLANK",
                                         "acceptedAnswers":["O"],"caseSensitive":true}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.acceptedAnswers[0]").value("O"))
                .andExpect(jsonPath("$.data.caseSensitive").value(true));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "{\"text\":\"\",\"type\":\"TRUE_FALSE\",\"correctOptionIndex\":0}",
                "{\"text\":\"q\",\"type\":\"SINGLE_CHOICE\",\"options\":[\"a\"],\"correctOptionIndex\":0}",
                "{\"text\":\"q\",\"type\":\"SINGLE_CHOICE\",\"options\":[\"a\",\"b\"],\"correctOptionIndex\":4}",
                "{\"text\":\"q\",\"type\":\"MULTIPLE_CHOICE\",\"options\":[\"a\",\"b\"],\"correctOptionIndexes\":[]}",
                "{\"text\":\"no"
                        + " blank\",\"type\":\"FILL_IN_THE_BLANK\",\"acceptedAnswers\":[\"x\"]}",
                "{\"text\":\"q\",\"type\":\"MATCHING\"}"
            })
    void create_invalidQuestion_returnsBadRequest(String body) throws Exception {
        mockMvc.perform(
                        post(QUESTIONS, shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createBulk_addsAllQuestions() throws Exception {
        mockMvc.perform(
                        post(QUESTIONS + "/bulk", shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"questions":[
                                         {"text":"2+2=?","type":"SINGLE_CHOICE",
                                          "options":["3","4"],"correctOptionIndex":1},
                                         {"text":"Sky is green","type":"TRUE_FALSE",
                                          "correctOptionIndex":1}]}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId).with(bearer(session)))
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void createBulk_oneInvalidQuestion_createsNothing() throws Exception {
        mockMvc.perform(
                        post(QUESTIONS + "/bulk", shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"questions":[
                                         {"text":"2+2=?","type":"SINGLE_CHOICE",
                                          "options":["3","4"],"correctOptionIndex":1},
                                         {"text":"Bad","type":"SINGLE_CHOICE",
                                          "options":["3","4"],"correctOptionIndex":9}]}
                                        """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId).with(bearer(session)))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void createBulk_emptyList_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post(QUESTIONS + "/bulk", shelfId, testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"questions\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otherUsersShelf_returnsNotFound() throws Exception {
        AuthSession other = authenticate(EMAIL_2);

        mockMvc.perform(get(QUESTIONS, shelfId, testSuiteId).with(bearer(other)))
                .andExpect(status().isNotFound());
    }
}
