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

import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.integration.support.AbstractControllerTest;
import com.app.oopsly.api.integration.support.LibraryFixture;
import com.app.oopsly.api.repository.SubjectRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("DiscoverController integration")
class DiscoverControllerTest extends AbstractControllerTest {

    @Autowired private SubjectRepository subjectRepository;

    private AuthSession owner;
    private AuthSession cloner;
    private UUID publicSubjectId;

    @BeforeEach
    void setUp() throws Exception {
        owner = authenticate(EMAIL);
        cloner = authenticate(EMAIL_2);

        LibraryFixture.LibraryIds library =
                LibraryFixture.seed(mockMvc, objectMapper, owner.accessToken());
        publicSubjectId = library.subjectId();

        // mark subject public via settings path if available; otherwise mutate entity
        SubjectEntity subject = subjectRepository.findById(publicSubjectId).orElseThrow();
        subject.setIsPublic(true);
        subjectRepository.saveAndFlush(subject);

        // cloner needs a shelf to receive clones
        LibraryFixture.createShelf(mockMvc, objectMapper, cloner.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/discover")).andExpect(status().isUnauthorized());
    }

    @Test
    void discover_listsPublicDecks() throws Exception {
        mockMvc.perform(get("/discover").param("q", "Integration").with(bearer(cloner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void clone_publicDeck_returnsCreated() throws Exception {
        mockMvc.perform(post("/discover/{id}/clone", publicSubjectId).with(bearer(cloner)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void clone_unknown_returnsNotFound() throws Exception {
        mockMvc.perform(post("/discover/{id}/clone", UUID.randomUUID()).with(bearer(cloner)))
                .andExpect(status().isNotFound());
    }
}
