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

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("AiCardGenerationController integration")
class AiCardGenerationControllerTest extends AbstractControllerTest {

    @Test
    void generateCards_withAiDisabled_returnsStarterCards() throws Exception {
        mockMvc.perform(
                        post("/ai/generate-cards")
                                .with(bearer(authenticate(EMAIL)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"topic\":\"Photosynthesis\",\"notes\":\"light to"
                                                + " sugar\",\"count\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.length()", greaterThan(0)));
    }

    @Test
    void generateCards_rejectsOutOfRangeCounts() throws Exception {
        AuthSession session = authenticate(EMAIL);
        for (int count : new int[] {0, 51}) {
            mockMvc.perform(
                            post("/ai/generate-cards")
                                    .with(bearer(session))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"topic\":\"x\",\"count\":" + count + "}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void generateCards_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(
                        post("/ai/generate-cards")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"topic\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }
}
