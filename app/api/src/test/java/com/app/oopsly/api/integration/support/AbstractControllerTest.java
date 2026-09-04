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

package com.app.oopsly.api.integration.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("integration")
@Transactional
@ExtendWith(EmbeddedRedisExtension.class)
public abstract class AbstractControllerTest {

    protected static final String EMAIL = "integration@oopsly.com";
    protected static final String EMAIL_2 = "integration2@oopsly.com";
    protected static final String TEST_OTP = "000000";

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) throws Exception {
        int port = EmbeddedRedisExtension.ensureStarted();
        registry.add("spring.data.redis.host", () -> "127.0.0.1");
        registry.add("spring.data.redis.port", () -> port);
        registry.add("EMBEDDED_REDIS_PORT", () -> port);
    }

    protected AuthSession authenticate(String email) throws Exception {
        mockMvc.perform(post("/otp").param("email", email)).andExpect(status().isOk());

        MvcResult result =
                mockMvc.perform(
                                post("/otp/validate")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"email":"%s","otp":"%s"}
                                                """
                                                        .formatted(email, TEST_OTP)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andExpect(jsonPath("$.data.access_token").isNotEmpty())
                        .andReturn();

        JsonNode data =
                objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return new AuthSession(
                data.get("access_token").asText(), data.get("refresh_token").asText(), email);
    }

    protected RequestPostProcessor bearer(String accessToken) {
        return request -> {
            request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
            return request;
        };
    }

    protected RequestPostProcessor bearer(AuthSession session) {
        return bearer(session.accessToken());
    }

    protected UUID uuidFromDataId(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode data = root.get("data");
        if (data == null || data.isNull()) {
            throw new IllegalStateException(
                    "Response has no data: " + result.getResponse().getContentAsString());
        }
        if (data.has("id")) {
            return UUID.fromString(data.get("id").asText());
        }
        throw new IllegalStateException("data.id missing: " + data);
    }

    protected JsonNode dataNode(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    protected record AuthSession(String accessToken, String refreshToken, String email) {}
}
