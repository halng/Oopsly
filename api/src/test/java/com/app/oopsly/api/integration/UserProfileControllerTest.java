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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("UserProfileController integration")
class UserProfileControllerTest extends AbstractControllerTest {

    private AuthSession session;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/user/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    void getProfile_returnsOk() throws Exception {
        mockMvc.perform(get("/user/profile").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void updateProfile_valid_returnsOk() throws Exception {
        mockMvc.perform(
                        patch("/user/profile")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "displayName": "Integration User",
                                          "bio": "Learning every day",
                                          "age": 25
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.displayName").value("Integration User"));
    }

    @Test
    void updateProfile_blankDisplayName_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        patch("/user/profile")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"displayName":"","bio":"x","age":20}
                                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateSettings_valid_returnsOk() throws Exception {
        mockMvc.perform(
                        patch("/user/settings")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "theme": "LIGHT",
                                          "language": "en",
                                          "spaceConfig": {
                                            "AGAIN": 0,
                                            "HARD": 1,
                                            "GOOD": 3,
                                            "EASY": 7
                                          },
                                          "studySchedule": {
                                            "preferredStudyTime": "09:30",
                                            "studyDays": [1, 2, 3, 4, 5],
                                            "reminderEnabled": true
                                          }
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void updateSettings_invalidTheme_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        patch("/user/settings")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "theme": "NEON",
                                          "language": "en",
                                          "spaceConfig": {
                                            "AGAIN": 0,
                                            "HARD": 1,
                                            "GOOD": 3,
                                            "EASY": 7
                                          },
                                          "studySchedule": {
                                            "preferredStudyTime": "09:30",
                                            "studyDays": [1],
                                            "reminderEnabled": false
                                          }
                                        }
                                        """))
                .andExpect(status().isBadRequest());
    }
}
