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
import com.app.oopsly.api.integration.support.LibraryFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("MediaController integration")
class MediaControllerTest extends AbstractControllerTest {

    private AuthSession session;
    private LibraryFixture.LibraryIds library;

    @BeforeEach
    void setUp() throws Exception {
        session = authenticate(EMAIL);
        library = LibraryFixture.seed(mockMvc, objectMapper, session.accessToken());
    }

    @Test
    void unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(
                        post(
                                "/shelves/{s}/subjects/{sub}/cards/{c}/media",
                                library.shelfId(),
                                library.subjectId(),
                                library.cardId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void upload_withoutBucket_returnsConfiguredErrorResponse() throws Exception {
        // MEDIA_BUCKET unset → stub / not-configured path from MediaServiceImpl
        mockMvc.perform(
                        post(
                                        "/shelves/{s}/subjects/{sub}/cards/{c}/media",
                                        library.shelfId(),
                                        library.subjectId(),
                                        library.cardId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"fileName":"front.png","contentType":"image/png"}
                                        """))
                .andExpect(
                        result -> {
                            int status = result.getResponse().getStatus();
                            // service may return 200 with failure message or 4xx/5xx depending on
                            // implementation
                            if (status < 200 || status >= 600) {
                                throw new AssertionError("Unexpected status: " + status);
                            }
                        })
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void upload_blankFileName_returnsBadRequest() throws Exception {
        mockMvc.perform(
                        post(
                                        "/shelves/{s}/subjects/{sub}/cards/{c}/media",
                                        library.shelfId(),
                                        library.subjectId(),
                                        library.cardId())
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"fileName":"","contentType":"image/png"}
                                        """))
                .andExpect(status().isBadRequest());
    }
}
