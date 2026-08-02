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

package com.app.oopsly.api.integration.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

public final class LibraryFixture {

    private LibraryFixture() {}

    public static UUID createShelf(MockMvc mockMvc, ObjectMapper mapper, String token)
            throws Exception {
        MvcResult result =
                mockMvc.perform(
                                post("/shelves")
                                        .header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "icon": "📚",
                                                  "name": "Integration Shelf",
                                                  "description": "Shelf description for integration tests"
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();
        return UUID.fromString(
                mapper.readTree(result.getResponse().getContentAsString())
                        .get("data")
                        .get("id")
                        .asText());
    }

    public static UUID createSubject(
            MockMvc mockMvc, ObjectMapper mapper, String token, UUID shelfId) throws Exception {
        MvcResult result =
                mockMvc.perform(
                                post("/shelves/{shelfId}/subjects", shelfId)
                                        .header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "name": "Integration Subject",
                                                  "description": "Subject for integration tests"
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();
        return UUID.fromString(
                mapper.readTree(result.getResponse().getContentAsString())
                        .get("data")
                        .get("id")
                        .asText());
    }

    public static UUID createCard(
            MockMvc mockMvc, ObjectMapper mapper, String token, UUID shelfId, UUID subjectId)
            throws Exception {
        MvcResult result =
                mockMvc.perform(
                                post(
                                                "/shelves/{shelfId}/subjects/{subjectId}/cards",
                                                shelfId,
                                                subjectId)
                                        .header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "cards": [
                                                    { "front": "Capital of France?", "back": "Paris" }
                                                  ]
                                                }
                                                """))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        if (data != null && data.isArray() && !data.isEmpty()) {
            return UUID.fromString(data.get(0).get("id").asText());
        }
        throw new IllegalStateException("Unexpected create card response: " + data);
    }

    public record LibraryIds(UUID shelfId, UUID subjectId, UUID cardId) {}

    public static LibraryIds seed(MockMvc mockMvc, ObjectMapper mapper, String token)
            throws Exception {
        UUID shelfId = createShelf(mockMvc, mapper, token);
        UUID subjectId = createSubject(mockMvc, mapper, token, shelfId);
        UUID cardId = createCard(mockMvc, mapper, token, shelfId, subjectId);
        return new LibraryIds(shelfId, subjectId, cardId);
    }
}
