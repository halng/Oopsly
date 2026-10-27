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

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import com.app.oopsly.api.integration.support.LibraryFixture;
import com.app.oopsly.api.integration.support.LibraryFixture.LibraryIds;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("QuizController integration")
class QuizControllerTest extends AbstractControllerTest {

    private UUID createSuiteWithQuestion(AuthSession session, UUID shelfId, boolean withQuestion)
            throws Exception {
        UUID suiteId =
                uuidFromDataId(
                        mockMvc.perform(
                                        post("/v1/shelves/{s}/test-suites", shelfId)
                                                .with(bearer(session))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"title\":\"Live Quiz\"}"))
                                .andExpect(status().isCreated())
                                .andReturn());
        if (withQuestion) {
            mockMvc.perform(
                            post("/v1/shelves/{s}/test-suites/{t}/questions", shelfId, suiteId)
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {"text":"2+2=?","type":"SINGLE_CHOICE",
                                             "options":["3","4"],"correctOptionIndex":1}
                                            """))
                    .andExpect(status().isCreated());
        }
        return suiteId;
    }

    private String body(UUID shelfId, UUID suiteId) {
        return "{\"shelfId\":\"%s\",\"testSuiteId\":\"%s\",\"mode\":\"AUTO\",\"questionSeconds\":30}"
                .formatted(shelfId, suiteId);
    }

    @Test
    void createRoom_freePlanHostsTwentyPlayers() throws Exception {
        AuthSession session = authenticate(EMAIL);
        LibraryIds library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
        UUID suiteId = createSuiteWithQuestion(session, library.shelfId(), true);

        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body(library.shelfId(), suiteId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value(matchesPattern("\\d{6}")))
                .andExpect(jsonPath("$.data.state").value("LOBBY"))
                .andExpect(jsonPath("$.data.mode").value("AUTO"))
                .andExpect(jsonPath("$.data.questionSeconds").value(30))
                .andExpect(jsonPath("$.data.totalQuestions").value(1))
                .andExpect(jsonPath("$.data.maxPlayers").value(20))
                .andExpect(jsonPath("$.data.question").doesNotExist());
    }

    @Test
    void createRoom_roomSizeFollowsTheSubscriptionPlan() throws Exception {
        for (String[] plan : new String[][] {{"PRO", "50"}, {"PRO_PLUS", "100"}}) {
            AuthSession session = authenticate("plan-" + plan[0] + "@oopsly.com", plan[0]);
            LibraryIds library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
            UUID suiteId = createSuiteWithQuestion(session, library.shelfId(), true);

            mockMvc.perform(
                            post("/v1/quiz/rooms")
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body(library.shelfId(), suiteId)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.maxPlayers").value(Integer.parseInt(plan[1])));
        }
    }

    @Test
    void createRoom_suiteWithoutQuestionsIsRefused() throws Exception {
        AuthSession session = authenticate(EMAIL);
        LibraryIds library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
        UUID suiteId = createSuiteWithQuestion(session, library.shelfId(), false);

        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body(library.shelfId(), suiteId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRoom_cannotHostSomeoneElsesTest() throws Exception {
        AuthSession owner = authenticate(EMAIL);
        LibraryIds library = LibraryFixture.seed(mockMvc, objectMapper, owner.accessToken());
        UUID suiteId = createSuiteWithQuestion(owner, library.shelfId(), true);

        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(authenticate(EMAIL_2)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body(library.shelfId(), suiteId)))
                .andExpect(status().isNotFound());
        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body(library.shelfId(), UUID.randomUUID())))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRoom_validatesTheRequest() throws Exception {
        AuthSession session = authenticate(EMAIL);
        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"shelfId\":\"%s\",\"testSuiteId\":\"%s\",\"questionSeconds\":2}"
                                                .formatted(UUID.randomUUID(), UUID.randomUUID())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRoom_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(
                        post("/v1/quiz/rooms")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
