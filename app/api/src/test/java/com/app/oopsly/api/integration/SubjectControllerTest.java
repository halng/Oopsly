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

@DisplayName("SubjectController integration")
class SubjectControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private UUID shelfId;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        shelfId = LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/shelves/{shelfId}/subjects", shelfId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_valid_returnsCreated() throws Exception {
        mockMvc.perform(
                        post("/shelves/{shelfId}/subjects", shelfId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Biology","description":"Cells and organisms"}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Biology"));
    }

    @Test
    void create_blankName_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post("/shelves/{shelfId}/subjects", shelfId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"","description":"x"}
                                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_returnsOk() throws Exception {
        LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
        mockMvc.perform(
                        get("/shelves/{shelfId}/subjects", shelfId)
                                .param("page", "0")
                                .param("size", "20")
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void getById_found_and_missing() throws Exception {
        UUID subjectId =
                LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
        mockMvc.perform(
                        get("/shelves/{shelfId}/subjects/{id}", shelfId, subjectId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(subjectId.toString()));
        mockMvc.perform(
                        get("/shelves/{shelfId}/subjects/{id}", shelfId, UUID.randomUUID())
                                .with(bearer(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_returnsOk() throws Exception {
        UUID subjectId =
                LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
        mockMvc.perform(
                        put("/shelves/{shelfId}/subjects/{id}", shelfId, subjectId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Chemistry","description":"Updated desc"}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void updateSettings_returnsOk() throws Exception {
        UUID subjectId =
                LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
        mockMvc.perform(
                        put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"dailyLimit":30,"newCardsPerDay":10,"interval":1.5}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void softDelete_returnsOk() throws Exception {
        UUID subjectId =
                LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
        mockMvc.perform(
                        patch("/shelves/{shelfId}/subjects/{id}", shelfId, subjectId)
                                .with(bearer(session)))
                .andExpect(status().isOk());
        mockMvc.perform(
                        get("/shelves/{shelfId}/subjects/{id}", shelfId, subjectId)
                                .with(bearer(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_unknownShelf_returnsNotFound() throws Exception {
        mockMvc.perform(
                        post("/shelves/{shelfId}/subjects", UUID.randomUUID())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Orphan","description":"no shelf"}
                                        """))
                .andExpect(status().isNotFound());
    }
}
