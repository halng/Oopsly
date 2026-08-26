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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("OTPController integration")
class OTPControllerTest extends AbstractControllerTest {

    @Nested
    @DisplayName("POST /otp")
    class CreateOtp {

        @Test
        void sendOtp_testEmail_returnsOk() throws Exception {
            mockMvc.perform(post("/otp").param("email", EMAIL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true));
        }

        @Test
        void sendOtp_invalidEmail_returnsBadRequest() throws Exception {
            mockMvc.perform(post("/otp").param("email", "not-an-email"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /otp/validate")
    class ValidateOtp {

        @Test
        void validate_testEmailAndOtp_returnsTokens() throws Exception {
            mockMvc.perform(post("/otp").param("email", EMAIL)).andExpect(status().isOk());

            mockMvc.perform(
                            post("/otp/validate")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {"email":"%s","otp":"%s"}
                                            """
                                                    .formatted(EMAIL, TEST_OTP)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isSuccess").value(true))
                    .andExpect(jsonPath("$.data.access_token").isNotEmpty())
                    .andExpect(jsonPath("$.data.refresh_token").isNotEmpty())
                    .andExpect(jsonPath("$.data.type").value("Bearer"));
        }

        @Test
        void validate_wrongOtpForNonTestPath_returnsClientError() throws Exception {
            // Non-test email requires Redis OTP; without a prior send this is expired/not found
            mockMvc.perform(
                            post("/otp/validate")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {"email":"random-user@example.com","otp":"123456"}
                                            """))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.isSuccess").value(false));
        }

        @Test
        void validate_shortOtp_returnsBadRequest() throws Exception {
            mockMvc.perform(
                            post("/otp/validate")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {"email":"%s","otp":"12"}
                                            """
                                                    .formatted(EMAIL)))
                    .andExpect(status().isBadRequest());
        }
    }
}
