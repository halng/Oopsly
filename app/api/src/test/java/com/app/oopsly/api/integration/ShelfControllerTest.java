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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("ShelfController integration")
class ShelfControllerTest extends AbstractControllerTest {

    private AuthSession session;

    @BeforeEach
    void login() throws Exception {
        session = authenticate(EMAIL);
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/shelves")).andExpect(status().isUnauthorized());
    }

    @Nested
    class Crud {

        @Test
        void create_valid_returnsCreated() throws Exception {
            mockMvc.perform(
                            post("/shelves")
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {
                                              "icon": "📚",
                                              "name": "My Shelf",
                                              "description": "A valid shelf description here"
                                            }
                                            """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.isSuccess").value(true))
                    .andExpect(jsonPath("$.data.id").isNotEmpty())
                    .andExpect(jsonPath("$.data.name").value("My Shelf"));
        }

        @Test
        void create_shortDescription_returnsBadRequest() throws Exception {
            mockMvc.perform(
                            post("/shelves")
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {"icon":"x","name":"n","description":"short"}
                                            """))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void getAll_returnsPage() throws Exception {
            LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
            mockMvc.perform(
                            get("/shelves")
                                    .param("page", "0")
                                    .param("size", "10")
                                    .with(bearer(session)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
        }

        @Test
        void getById_found_returnsOk() throws Exception {
            UUID id = LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
            mockMvc.perform(get("/shelves/{id}", id).with(bearer(session)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(id.toString()));
        }

        @Test
        void getById_missing_returnsNotFound() throws Exception {
            mockMvc.perform(get("/shelves/{id}", UUID.randomUUID()).with(bearer(session)))
                    .andExpect(status().isNotFound());
        }

        @Test
        void update_valid_returnsOk() throws Exception {
            UUID id = LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
            mockMvc.perform(
                            put("/shelves/{id}", id)
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {
                                              "icon": "⭐",
                                              "name": "Updated Shelf",
                                              "description": "Updated shelf description text"
                                            }
                                            """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
        }

        @Test
        void softDelete_returnsOk_thenGetReturnsNotFound() throws Exception {
            UUID id = LibraryFixture.createShelf(mockMvc, objectMapper, session.accessToken());
            mockMvc.perform(patch("/shelves/{id}", id).with(bearer(session)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
            mockMvc.perform(get("/shelves/{id}", id).with(bearer(session)))
                    .andExpect(status().isNotFound());
        }
    }
}
