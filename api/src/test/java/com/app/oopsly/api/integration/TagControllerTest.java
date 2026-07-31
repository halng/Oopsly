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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

@DisplayName("TagController integration")
class TagControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private LibraryFixture.LibraryIds library;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/tags")).andExpect(status().isUnauthorized());
    }

    @Test
    void create_list_link_filter_unlink_softDelete() throws Exception {
        var create =
                mockMvc.perform(
                                post("/tags")
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"name":"vocab"}
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();

        var data = objectMapper.readTree(create.getResponse().getContentAsString()).get("data");
        UUID tagId = UUID.fromString(data.has("id") ? data.get("id").asText() : data.asText());

        mockMvc.perform(get("/tags").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        post(
                                        "/shelves/{s}/subjects/{sub}/cards/{c}/tags/{t}",
                                        library.shelfId(),
                                        library.subjectId(),
                                        library.cardId(),
                                        tagId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        get(
                                        "/shelves/{s}/subjects/{sub}/cards/by-tag/{t}",
                                        library.shelfId(),
                                        library.subjectId(),
                                        tagId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        delete(
                                        "/shelves/{s}/subjects/{sub}/cards/{c}/tags/{t}",
                                        library.shelfId(),
                                        library.subjectId(),
                                        library.cardId(),
                                        tagId)
                                .with(bearer(session)))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/tags/{id}", tagId).with(bearer(session)))
                .andExpect(status().isOk());
    }

    @Test
    void create_blankName_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post("/tags")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":""}
                                        """))
                .andExpect(status().isBadRequest());
    }
}
