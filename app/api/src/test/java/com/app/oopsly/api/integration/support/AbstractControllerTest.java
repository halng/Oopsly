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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
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

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) throws Exception {
        int port = EmbeddedRedisExtension.ensureStarted();
        registry.add("spring.data.redis.host", () -> "127.0.0.1");
        registry.add("spring.data.redis.port", () -> port);
        registry.add("EMBEDDED_REDIS_PORT", () -> port);
    }

    /**
     * Stands in for the auth service: signs a token the same way it does (HS384, shared secret).
     */
    protected AuthSession authenticate(String email) {
        return authenticate(email, "FREE");
    }

    /** Same as {@link #authenticate(String)} with a specific subscription plan claim. */
    protected AuthSession authenticate(String email, String plan) {
        UUID userId = UUID.nameUUIDFromBytes(email.getBytes(StandardCharsets.UTF_8));
        String token =
                Jwts.builder()
                        .claims(Map.of("id", userId.toString(), "role", "USER", "plan", plan))
                        .subject(email)
                        .issuedAt(new Date())
                        .expiration(new Date(System.currentTimeMillis() + 3_600_000))
                        .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret)))
                        .compact();
        return new AuthSession(token, userId, email);
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

    protected record AuthSession(String accessToken, UUID userId, String email) {}
}
