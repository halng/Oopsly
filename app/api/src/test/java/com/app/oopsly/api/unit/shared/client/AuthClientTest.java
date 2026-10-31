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

package com.app.oopsly.api.unit.shared.client;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.client.AuthProfile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClientException;

class AuthClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    private AuthClient clientFor(String baseUrl) {
        AppConfig config = new AppConfig();
        config.getAuth().setBaseUrl(baseUrl);
        config.getAuth().setInternalKey("secret-key");
        return new AuthClient(config, new ObjectMapper());
    }

    private String startServer(String body, AtomicInteger calls, AtomicReference<String> keyHeader)
            throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/api/auth/internal/v1/users/lookup",
                exchange -> {
                    calls.incrementAndGet();
                    keyHeader.set(exchange.getRequestHeaders().getFirst("X-Internal-Key"));
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().add("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, bytes.length);
                    exchange.getResponseBody().write(bytes);
                    exchange.close();
                });
        server.start();
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/api/auth";
    }

    @Test
    void lookup_returnsProfilesFromAuthServiceAndCachesThem() throws Exception {
        UUID known = UUID.randomUUID();
        UUID unknown = UUID.randomUUID();
        AtomicInteger calls = new AtomicInteger();
        AtomicReference<String> keyHeader = new AtomicReference<>();
        String body =
                """
                {"isSuccess":true,"timestamp":"2026-01-01T00:00:00Z","message":"ok","statusCode":200,
                 "data":[{"id":"%s","name":"Ana","displayName":"Ana D","pictureUrl":"https://cdn/a.png","dailyGoal":35}]}
                """
                        .formatted(known);
        AuthClient client = clientFor(startServer(body, calls, keyHeader));

        Map<UUID, AuthProfile> result = client.lookup(List.of(known, unknown));

        assertEquals("Ana D", result.get(known).label());
        assertEquals(35, result.get(known).dailyGoalOrDefault());
        assertEquals(AuthProfile.unknown(unknown), result.get(unknown));
        assertEquals("secret-key", keyHeader.get());

        // the known profile is now served from the cache; only the unknown id is asked again
        assertEquals("Ana D", client.lookup(List.of(known)).get(known).label());
        assertEquals(1, calls.get());
    }

    @Test
    void notifyCommunityInvite_postsTheInviteWithTheInternalKey() throws Exception {
        AtomicReference<String> keyHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/api/auth/internal/v1/notifications/community-invite",
                exchange -> {
                    keyHeader.set(exchange.getRequestHeaders().getFirst("X-Internal-Key"));
                    requestBody.set(
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8));
                    exchange.sendResponseHeaders(200, -1);
                    exchange.close();
                });
        server.start();
        AuthClient client =
                clientFor("http://127.0.0.1:" + server.getAddress().getPort() + "/api/auth");
        UUID userId = UUID.randomUUID();

        client.notifyCommunityInvite(userId, "Math Club", "Bo");

        assertEquals("secret-key", keyHeader.get());
        assertTrue(requestBody.get().contains(userId.toString()));
        assertTrue(requestBody.get().contains("Math Club"));
    }

    @Test
    void notifyCommunityInvite_neverThrowsWhenAuthIsUnreachable() {
        AuthClient client = clientFor("http://127.0.0.1:1/api/auth");

        assertDoesNotThrow(() -> client.notifyCommunityInvite(UUID.randomUUID(), "Club", "Bo"));
    }

    @Test
    void lookup_whenAuthIsUnreachable_throwsSoTheCircuitBreakerFallbackCanTakeOver() {
        AuthClient client = clientFor("http://127.0.0.1:1/api/auth");

        assertThrows(RestClientException.class, () -> client.lookup(List.of(UUID.randomUUID())));
    }

    @Test
    @SuppressWarnings("unchecked")
    void collectionFallback_returnsPlaceholderProfiles() throws Exception {
        AuthClient client = clientFor("http://127.0.0.1:1/api/auth");
        UUID id = UUID.randomUUID();
        Method fallback =
                AuthClient.class.getDeclaredMethod(
                        "lookupFallback", java.util.Collection.class, Throwable.class);
        fallback.setAccessible(true);

        Map<UUID, AuthProfile> result =
                (Map<UUID, AuthProfile>)
                        fallback.invoke(client, List.of(id), new RuntimeException());

        assertEquals("Unknown", result.get(id).label());
        assertEquals(20, result.get(id).dailyGoalOrDefault());
    }

    @Test
    void singleFallback_returnsPlaceholderProfile() throws Exception {
        AuthClient client = clientFor("http://127.0.0.1:1/api/auth");
        UUID id = UUID.randomUUID();
        Method fallback =
                AuthClient.class.getDeclaredMethod("lookupFallback", UUID.class, Throwable.class);
        fallback.setAccessible(true);

        AuthProfile profile = (AuthProfile) fallback.invoke(client, id, new RuntimeException());

        assertEquals(AuthProfile.unknown(id), profile);
    }

    @Test
    void profile_labelPrefersDisplayNameThenNameThenUnknown() {
        UUID id = UUID.randomUUID();

        assertEquals("D", new AuthProfile(id, "N", "D", null, null).label());
        assertEquals("N", new AuthProfile(id, "N", " ", null, null).label());
        assertEquals("Unknown", new AuthProfile(id, null, null, null, 0).label());
        assertEquals(20, new AuthProfile(id, null, null, null, 0).dailyGoalOrDefault());
    }
}
