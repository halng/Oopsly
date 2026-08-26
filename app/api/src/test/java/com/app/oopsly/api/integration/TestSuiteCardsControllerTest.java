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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import com.app.oopsly.api.integration.support.LibraryFixture;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("TestSuiteCardsController integration")
class TestSuiteCardsControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private UUID suiteId;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        LibraryFixture.LibraryIds library =
                LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
        var create =
                mockMvc.perform(
                                post("/shelves/{s}/test-suites", library.shelfId())
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "title": "Cards Suite",
                                                  "isActive": true,
                                                  "subjectIds": ["%s"],
                                                  "selection": { "mode": "ALL", "limit": 20, "shuffle": false }
                                                }
                                                """
                                                        .formatted(library.subjectId())))
                        .andExpect(status().isCreated())
                        .andReturn();
        suiteId =
                UUID.fromString(
                        objectMapper
                                .readTree(create.getResponse().getContentAsString())
                                .get("data")
                                .get("id")
                                .asText());
    }

    @Test
    void getCards_authenticated_returnsOk() throws Exception {
        mockMvc.perform(get("/test-suites/{id}/cards", suiteId).with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void getCards_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/test-suites/{id}/cards", suiteId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getCards_unknownSuite_returnsNotFound() throws Exception {
        mockMvc.perform(get("/test-suites/{id}/cards", UUID.randomUUID()).with(bearer(session)))
                .andExpect(status().isNotFound());
    }
}
