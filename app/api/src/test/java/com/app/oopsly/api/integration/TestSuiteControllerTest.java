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

    private static final String SUITES = "/v1/shelves/{s}/test-suites";
    private static final String SUITE = SUITES + "/{id}";

    private AuthSession session;
    private LibraryFixture.LibraryIds library;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
    }

    private UUID createSuite(String title) throws Exception {
        return uuidFromDataId(
                mockMvc.perform(
                                post(SUITES, library.shelfId())
                                        .with(bearer(session))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"title":"%s","description":"Unit 1","timeLimitMinutes":5}
                                                """
                                                        .formatted(title)))
                        .andExpect(status().isCreated())
                        .andReturn());
    }

    private void addQuestion(UUID suiteId, String json) throws Exception {
        mockMvc.perform(
                        post(SUITE + "/questions", library.shelfId(), suiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json))
                .andExpect(status().isCreated());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get(SUITES, library.shelfId())).andExpect(status().isUnauthorized());
    }

    @Test
    void create_generatesUniqueSlugs_andListsWithQuestionCount() throws Exception {
        UUID first = createSuite("Final Exam");
        createSuite("Final Exam");

        mockMvc.perform(get(SUITE, library.shelfId(), first).with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("final-exam"))
                .andExpect(jsonPath("$.data.description").value("Unit 1"))
                .andExpect(jsonPath("$.data.timeLimitMinutes").value(5))
                .andExpect(jsonPath("$.data.questionCount").value(0));

        mockMvc.perform(get(SUITES, library.shelfId()).with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[1].slug").value("final-exam-2"));
    }

    @Test
    void update_changesSlug_andDeleteHidesSuite() throws Exception {
        UUID suiteId = createSuite("Draft");

        mockMvc.perform(
                        put(SUITE, library.shelfId(), suiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\"Midterm\",\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("midterm"))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.timeLimitMinutes").doesNotExist());

        mockMvc.perform(patch(SUITE, library.shelfId(), suiteId).with(bearer(session)))
                .andExpect(status().isOk());
        mockMvc.perform(get(SUITE, library.shelfId(), suiteId).with(bearer(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_invalidBody_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post(SUITES, library.shelfId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\" \",\"timeLimitMinutes\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otherUsersShelf_returnsNotFound() throws Exception {
        UUID suiteId = createSuite("Private");
        AuthSession other = authenticate(EMAIL_2);

        mockMvc.perform(get(SUITE, library.shelfId(), suiteId).with(bearer(other)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(SUITE + "/attempt", library.shelfId(), suiteId).with(bearer(other)))
                .andExpect(status().isNotFound());
    }

    @Test
    void attempt_hidesAnswers_andSubmitGradesEveryType() throws Exception {
        UUID suiteId = createSuite("Mixed");
        addQuestion(
                suiteId,
                """
                {"text":"2+2?","type":"SINGLE_CHOICE","options":["3","4"],"correctOptionIndex":1,
                 "explanation":"basic"}
                """);
        addQuestion(
                suiteId,
                """
                {"text":"Primes","type":"MULTIPLE_CHOICE","options":["2","3","4"],
                 "correctOptionIndexes":[0,1]}
                """);
        addQuestion(
                suiteId,
                """
                {"text":"Sky is green","type":"TRUE_FALSE","correctOptionIndex":1}
                """);
        addQuestion(
                suiteId,
                """
                {"text":"Capital of France is ___","type":"FILL_IN_THE_BLANK",
                 "acceptedAnswers":["Paris"]}
                """);

        var attempt =
                mockMvc.perform(
                                get(SUITE + "/attempt", library.shelfId(), suiteId)
                                        .with(bearer(session)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.data.timeLimitSeconds").value(300))
                        .andExpect(jsonPath("$.data.questions", hasSize(4)))
                        .andExpect(jsonPath("$.data.questions[0].options", hasSize(2)))
                        .andExpect(
                                jsonPath("$.data.questions[0].correctOptionIndex").doesNotExist())
                        .andExpect(jsonPath("$.data.questions[2].options[0]").value("True"))
                        .andExpect(jsonPath("$.data.questions[3].options", hasSize(0)))
                        .andReturn();

        var questions = dataNode(attempt).get("questions");
        String single = questions.get(0).get("id").asText();
        String multi = questions.get(1).get("id").asText();
        String trueFalse = questions.get(2).get("id").asText();
        String blank = questions.get(3).get("id").asText();

        mockMvc.perform(
                        post(SUITE + "/submit", library.shelfId(), suiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"answers":{"%s":1,"%s":0},
                                         "multiAnswers":{"%s":[1,0]},
                                         "textAnswers":{"%s":" paris "},
                                         "timeSpentSeconds":42}
                                        """
                                                .formatted(single, trueFalse, multi, blank)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.score").value(3))
                .andExpect(jsonPath("$.data.totalQuestions").value(4))
                .andExpect(jsonPath("$.data.percentage").value(75))
                .andExpect(jsonPath("$.data.timeSpentSeconds").value(42))
                .andExpect(jsonPath("$.data.breakdown[0].correct").value(true))
                .andExpect(jsonPath("$.data.breakdown[0].explanation").value("basic"))
                .andExpect(jsonPath("$.data.breakdown[2].correct").value(false))
                .andExpect(jsonPath("$.data.breakdown[2].correctAnswerText").value("False"))
                .andExpect(jsonPath("$.data.breakdown[3].correct").value(true));

        mockMvc.perform(get(SUITE, library.shelfId(), suiteId).with(bearer(session)))
                .andExpect(jsonPath("$.data.highestScore").value(75))
                .andExpect(jsonPath("$.data.questionCount").value(4));
    }

    @Test
    void submit_emptySuite_returnsBadRequest() throws Exception {
        UUID suiteId = createSuite("Empty");

        mockMvc.perform(
                        post(SUITE + "/submit", library.shelfId(), suiteId)
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"answers\":{}}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void legacyRunAndAutoGenerate_stillRespond() throws Exception {
        UUID suiteId = createSuite("Legacy");

        mockMvc.perform(post(SUITE + "/run", library.shelfId(), suiteId).with(bearer(session)))
                .andExpect(status().isOk());
        mockMvc.perform(
                        post(SUITES + "/auto-generate", library.shelfId())
                                .param("subjectId", library.subjectId().toString())
                                .with(bearer(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.slug").value("auto-integration-subject"));
    }
}
