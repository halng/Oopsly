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

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("UserController integration")
class UserControllerTest extends AbstractControllerTest {

    @Nested
    @DisplayName("GET /users/validate")
    class Validate {

        @Test
        void validate_withValidToken_returnsOk() throws Exception {
            AuthSession session = authenticate(EMAIL);
            mockMvc.perform(get("/users/validate").with(bearer(session)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
        }

        @Test
        void validate_withoutToken_returnsUnauthorized() throws Exception {
            mockMvc.perform(get("/users/validate")).andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("POST /users/refresh-token")
    class Refresh {

        @Test
        void refresh_withValidRefreshToken_returnsNewPair() throws Exception {
            AuthSession session = authenticate(EMAIL);
            mockMvc.perform(
                            post("/users/refresh-token")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {
                                              "refresh_token": "%s",
                                              "user_email": "%s"
                                            }
                                            """
                                                    .formatted(
                                                            session.refreshToken(),
                                                            session.email())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true))
                    .andExpect(jsonPath("$.data.access_token").isNotEmpty())
                    .andExpect(jsonPath("$.data.refresh_token").isNotEmpty());
        }

        @Test
        void refresh_withInvalidToken_returnsUnauthorizedOrBadRequest() throws Exception {
            mockMvc.perform(
                            post("/users/refresh-token")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {
                                              "refresh_token": "invalid-token",
                                              "user_email": "%s"
                                            }
                                            """
                                                    .formatted(EMAIL)))
                    .andExpect(
                            result -> {
                                int status = result.getResponse().getStatus();
                                if (status != 400
                                        && status != 401
                                        && status != 403
                                        && status != 503) {
                                    throw new AssertionError(
                                            "Unexpected status: "
                                                    + status
                                                    + " body="
                                                    + result.getResponse().getContentAsString());
                                }
                            });
        }

        @Test
        void refresh_missingFields_returnsBadRequest() throws Exception {
            mockMvc.perform(
                            post("/users/refresh-token")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /users/logout")
    class Logout {

        @Test
        void logout_authenticated_returnsOk() throws Exception {
            AuthSession session = authenticate(EMAIL);
            mockMvc.perform(post("/users/logout").with(bearer(session)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
        }

        @Test
        void logout_unauthenticated_returnsUnauthorized() throws Exception {
            mockMvc.perform(post("/users/logout")).andExpect(status().isUnauthorized());
        }
    }
}
