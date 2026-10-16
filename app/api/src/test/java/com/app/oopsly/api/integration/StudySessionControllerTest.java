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

@DisplayName("StudySessionController integration")
class StudySessionControllerTest extends AbstractControllerTest {

    private static final String PATH = "/v1/shelves/{s}/subjects/{sub}/study-sessions";

    private AuthSession session;
    private LibraryFixture.LibraryIds ids;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        ids = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(
                        post(PATH, ids.shelfId(), ids.subjectId())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"mode\":\"LEARN\",\"totalItems\":1}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void learn_capsItemsAtSubjectCardCount() throws Exception {
        mockMvc.perform(
                        post(PATH, ids.shelfId(), ids.subjectId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"mode":"LEARN","totalItems":50,"correctCount":50,
                                         "mistakes":2,"durationSeconds":120}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.xpGained").value(30));
    }

    @Test
    void match_awardsFastBonus() throws Exception {
        mockMvc.perform(
                        post(PATH, ids.shelfId(), ids.subjectId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"mode":"MATCH","totalItems":1,"correctCount":1,
                                         "mistakes":0,"durationSeconds":3}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.xpGained").value(30));
    }

    @Test
    void invalidBody_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post(PATH, ids.shelfId(), ids.subjectId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"mode\":\"LEARN\",\"totalItems\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownSubject_returnsNotFound() throws Exception {
        mockMvc.perform(
                        post(PATH, ids.shelfId(), UUID.randomUUID())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"mode\":\"MATCH\",\"totalItems\":1}"))
                .andExpect(status().isNotFound());
    }
}
