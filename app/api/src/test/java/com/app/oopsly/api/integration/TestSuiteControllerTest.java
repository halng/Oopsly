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

@DisplayName("TestSuiteController integration")
class TestSuiteControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private LibraryFixture.LibraryIds library;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/shelves/{s}/test-suites", library.shelfId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_list_get_update_run_autoGenerate_delete() throws Exception {
        var create =
                mockMvc.perform(
                                post("/shelves/{s}/test-suites", library.shelfId())
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "title": "Preset A",
                                                  "isActive": true,
                                                  "subjectIds": ["%s"],
                                                  "selection": {
                                                    "mode": "ALL",
                                                    "limit": 10,
                                                    "shuffle": true
                                                  }
                                                }
                                                """
                                                        .formatted(library.subjectId())))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();

        UUID suiteId =
                UUID.fromString(
                        objectMapper
                                .readTree(create.getResponse().getContentAsString())
                                .get("data")
                                .get("id")
                                .asText());

        mockMvc.perform(get("/shelves/{s}/test-suites", library.shelfId()).with(bearer(session)))
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/shelves/{s}/test-suites/{id}", library.shelfId(), suiteId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(suiteId.toString()));

        mockMvc.perform(
                        get("/shelves/{s}/test-suites/{id}", library.shelfId(), UUID.randomUUID())
                                .with(bearer(session)))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put("/shelves/{s}/test-suites/{id}", library.shelfId(), suiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "title": "Preset B",
                                          "isActive": true,
                                          "subjectIds": ["%s"],
                                          "selection": { "mode": "RANDOM", "limit": 5, "shuffle": false }
                                        }
                                        """
                                                .formatted(library.subjectId())))
                .andExpect(status().isOk());

        mockMvc.perform(
                        post("/shelves/{s}/test-suites/{id}/run", library.shelfId(), suiteId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        post("/shelves/{s}/test-suites/auto-generate", library.shelfId())
                                .param("subjectId", library.subjectId().toString())
                                .param("numQuestions", "2")
                                .with(bearer(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        patch("/shelves/{s}/test-suites/{id}", library.shelfId(), suiteId)
                                .with(bearer(session)))
                .andExpect(status().isOk());
    }
}
