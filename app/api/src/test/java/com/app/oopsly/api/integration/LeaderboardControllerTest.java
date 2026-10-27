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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("LeaderboardController integration")
class LeaderboardControllerTest extends AbstractControllerTest {

    @Test
    void globalLeaderboard_returnsRows() throws Exception {
        mockMvc.perform(get("/leaderboard").with(bearer(authenticate(EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void globalLeaderboard_honoursTheLimit_andRejectsBadOnes() throws Exception {
        AuthSession session = authenticate(EMAIL);
        mockMvc.perform(get("/leaderboard").param("limit", "5").with(bearer(session)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/leaderboard").param("limit", "0").with(bearer(session)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void globalLeaderboard_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/leaderboard")).andExpect(status().isUnauthorized());
    }
}
