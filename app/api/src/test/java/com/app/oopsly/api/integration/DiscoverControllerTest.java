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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import com.app.oopsly.api.integration.support.LibraryFixture;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

@DisplayName("DiscoverController integration")
class DiscoverControllerTest extends AbstractControllerTest {

    @Autowired private SubjectRepository subjectRepository;

    private AuthSession owner;
    private AuthSession cloner;
    private UUID publicSubjectId;
    private UUID publicSuiteId;
    private UUID clonerShelfId;

    @BeforeEach
    void setUp() throws Exception {
        owner = authenticate(EMAIL);
        cloner = authenticate(EMAIL_2);

        LibraryFixture.LibraryIds library =
                LibraryFixture.seed(mockMvc, objectMapper, owner.accessToken());
        publicSubjectId = library.subjectId();

        // mark subject public via settings path if available; otherwise mutate entity
        Subject subject = subjectRepository.findById(publicSubjectId).orElseThrow();
        subject.setIsPublic(true);
        subjectRepository.saveAndFlush(subject);

        // cloner needs a shelf to receive clones
        clonerShelfId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post("/v1/shelves")
                                                .with(bearer(cloner))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        "{\"name\":\"Mine\",\"color\":\"#8BC34A\"}"))
                                .andReturn());

        publicSuiteId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post("/v1/shelves/{s}/test-suites", library.shelfId())
                                                .with(bearer(owner))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        "{\"title\":\"Shared\",\"isPublic\":true}"))
                                .andExpect(status().isCreated())
                                .andReturn());
        mockMvc.perform(
                        post(
                                        "/v1/shelves/{s}/test-suites/{t}/questions",
                                        library.shelfId(),
                                        publicSuiteId)
                                .with(bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"text":"2+2=?","type":"SINGLE_CHOICE",
                                         "options":["3","4"],"correctOptionIndex":1}
                                        """))
                .andExpect(status().isCreated());
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

    @Test
    void discoverTestSuites_listsOnlyPublicOnes() throws Exception {
        mockMvc.perform(get("/discover/test-suites").with(bearer(cloner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.entities", hasSize(1)))
                .andExpect(jsonPath("$.data.entities[0].title").value("Shared"))
                .andExpect(jsonPath("$.data.entities[0].questionCount").value(1));
    }

    @Test
    void cloneTestSuite_copiesIntoChosenShelfWithQuestions() throws Exception {
        UUID cloneId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post("/discover/test-suites/{id}/clone", publicSuiteId)
                                                .with(bearer(cloner))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"shelfId\":\"" + clonerShelfId + "\"}"))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.data.isPublic").value(false))
                                .andExpect(jsonPath("$.data.questionCount").value(1))
                                .andReturn());

        mockMvc.perform(
                        get("/v1/shelves/{s}/test-suites/{t}", clonerShelfId, cloneId)
                                .with(bearer(cloner)))
                .andExpect(status().isOk());
    }

    @Test
    void cloneTestSuite_intoSomeoneElsesShelf_returnsNotFound() throws Exception {
        mockMvc.perform(
                        post("/discover/test-suites/{id}/clone", publicSuiteId)
                                .with(bearer(cloner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"shelfId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void cloneTestSuite_unknown_returnsNotFound() throws Exception {
        mockMvc.perform(
                        post("/discover/test-suites/{id}/clone", UUID.randomUUID())
                                .with(bearer(cloner)))
                .andExpect(status().isNotFound());
    }
}
