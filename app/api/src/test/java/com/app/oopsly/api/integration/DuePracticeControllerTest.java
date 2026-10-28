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
import com.app.oopsly.api.integration.support.LibraryFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("DuePracticeController integration")
class DuePracticeControllerTest extends AbstractControllerTest {

    @Test
    void dueCards_includeFreshlyCreatedCards() throws Exception {
        AuthSession session = authenticate(EMAIL);
        LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());

        mockMvc.perform(get("/v1/cards/due").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    void dueCards_forANewUserIsEmptyButSuccessful() throws Exception {
        mockMvc.perform(get("/v1/cards/due").with(bearer(authenticate(EMAIL_2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void dueCards_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/cards/due")).andExpect(status().isUnauthorized());
    }
}
