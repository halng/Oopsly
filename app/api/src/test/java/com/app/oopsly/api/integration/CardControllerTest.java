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

@DisplayName("CardController integration")
class CardControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private UUID shelfId;
    private UUID subjectId;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        shelfId = LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
        subjectId =
                LibraryFixture.createSubject(mockMvc, objectMapper, session.accessToken(), shelfId);
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/shelves/{s}/subjects/{sub}/cards", shelfId, subjectId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_list_get_update_due_difficulty_delete() throws Exception {
        var create =
                mockMvc.perform(
                                post("/shelves/{s}/subjects/{sub}/cards", shelfId, subjectId)
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "cards": [
                                                    {"front":"Q1","back":"A1"},
                                                    {"front":"Q2","back":"A2"}
                                                  ]
                                                }
                                                """))
                        .andReturn();
        if (create.getResponse().getStatus() != 200) {
            throw new AssertionError(
                    "create cards failed: status="
                            + create.getResponse().getStatus()
                            + " body="
                            + create.getResponse().getContentAsString());
        }

        UUID cardId =
                UUID.fromString(
                        objectMapper
                                .readTree(create.getResponse().getContentAsString())
                                .get("data")
                                .get(0)
                                .get("id")
                                .asText());

        mockMvc.perform(
                        get("/shelves/{s}/subjects/{sub}/cards", shelfId, subjectId)
                                .param("page", "0")
                                .param("size", "20")
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        get("/shelves/{s}/subjects/{sub}/cards/{id}", shelfId, subjectId, cardId)
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(cardId.toString()));

        mockMvc.perform(
                        get(
                                        "/shelves/{s}/subjects/{sub}/cards/{id}",
                                        shelfId,
                                        subjectId,
                                        UUID.randomUUID())
                                .with(bearer(session)))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put("/shelves/{s}/subjects/{sub}/cards/{id}", shelfId, subjectId, cardId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"front":"Updated Q","back":"Updated A"}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        get("/shelves/{s}/subjects/{sub}/cards/due", shelfId, subjectId)
                                .param("limit", "10")
                                .with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        put("/shelves/{s}/subjects/{sub}/cards/difficulty", shelfId, subjectId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        [{"cardId":"%s","newLevel":"GOOD"}]
                                        """
                                                .formatted(cardId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        mockMvc.perform(
                        put("/shelves/{s}/subjects/{sub}/cards/difficulty", shelfId, subjectId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        [{"cardId":"%s","newLevel":"NOT_A_LEVEL"}]
                                        """
                                                .formatted(cardId)))
                .andExpect(
                        result -> {
                            int status = result.getResponse().getStatus();
                            if (status != 400 && status != 503) {
                                throw new AssertionError(
                                        "Unexpected status for invalid difficulty: "
                                                + status
                                                + " body="
                                                + result.getResponse().getContentAsString());
                            }
                        });

        mockMvc.perform(
                        patch("/shelves/{s}/subjects/{sub}/cards/{id}", shelfId, subjectId, cardId)
                                .with(bearer(session)))
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/shelves/{s}/subjects/{sub}/cards/{id}", shelfId, subjectId, cardId)
                                .with(bearer(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_emptyCards_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post("/shelves/{s}/subjects/{sub}/cards", shelfId, subjectId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"cards":[]}
                                        """))
                .andExpect(status().isBadRequest());
    }
}
