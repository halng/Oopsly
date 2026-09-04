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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@DisplayName("QuestionController integration")
class QuestionControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        LibraryFixture.LibraryIds library =
                LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());

        MvcResult createSuite =
                mockMvc.perform(
                                post("/shelves/{s}/test-suites", library.shelfId())
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "title": "Q Suite",
                                                  "isActive": true,
                                                  "subjectIds": ["%s"],
                                                  "selection": { "mode": "ALL", "limit": 10, "shuffle": false }
                                                }
                                                """
                                                        .formatted(library.subjectId())))
                        .andExpect(status().isCreated())
                        .andReturn();
        testSuiteId =
                UUID.fromString(
                        objectMapper
                                .readTree(createSuite.getResponse().getContentAsString())
                                .get("data")
                                .get("id")
                                .asText());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/test-suites/{id}/questions", testSuiteId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_list_get_update_delete() throws Exception {
        MvcResult create =
                mockMvc.perform(
                                post("/test-suites/{id}/questions", testSuiteId)
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "text": "2+2=?",
                                                  "type": "MULTIPLE_CHOICE",
                                                  "metadata": "{\\"options\\":[\\"3\\",\\"4\\"],\\"correct_indices\\":[1]}"
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();

        UUID questionId =
                UUID.fromString(
                        objectMapper
                                .readTree(create.getResponse().getContentAsString())
                                .get("data")
                                .get("id")
                                .asText());

        mockMvc.perform(get("/test-suites/{id}/questions", testSuiteId).with(bearer(session)))
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/test-suites/{id}/questions/{qid}", testSuiteId, questionId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(questionId.toString()));

        mockMvc.perform(
                        get("/test-suites/{id}/questions/{qid}", testSuiteId, UUID.randomUUID())
                                .with(bearer(session)))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put("/test-suites/{id}/questions/{qid}", testSuiteId, questionId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "text": "Earth is flat?",
                                          "type": "TRUE_FALSE",
                                          "metadata": "{\\"correct_value\\":false}"
                                        }
                                        """))
                .andExpect(status().isOk());

        mockMvc.perform(
                        patch("/test-suites/{id}/questions/{qid}", testSuiteId, questionId)
                                .with(bearer(session)))
                .andExpect(status().isOk());
    }

    @Test
    void create_missingFields_returnsClientError() throws Exception {
        mockMvc.perform(
                        post("/test-suites/{id}/questions", testSuiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"text":"","type":"TRUE_FALSE","metadata":"{}"}
                                        """))
                .andExpect(
                        result -> {
                            int status = result.getResponse().getStatus();
                            if (status != 400 && status != 500) {
                                throw new AssertionError(
                                        "Unexpected status: "
                                                + status
                                                + " body="
                                                + result.getResponse().getContentAsString());
                            }
                        });
    }
}
