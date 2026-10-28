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

package com.app.oopsly.api.unit.shared.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.shared.security.HttpJwksKeyProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class HttpJwksKeyProviderTest {
    private final AtomicInteger fetches = new AtomicInteger();
    private final AtomicLong now = new AtomicLong(1_000);
    private String body;
    private boolean failing;
    private HttpJwksKeyProvider provider;

    private static String jwk(String kid) throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
        g.initialize(2048);
        RSAPublicKey key = (RSAPublicKey) g.generateKeyPair().getPublic();
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        return "{\"kty\":\"RSA\",\"alg\":\"RS256\",\"use\":\"sig\",\"kid\":\""
                + kid
                + "\",\"n\":\""
                + enc.encodeToString(unsigned(key.getModulus().toByteArray()))
                + "\",\"e\":\""
                + enc.encodeToString(unsigned(key.getPublicExponent().toByteArray()))
                + "\"}";
    }

    private static byte[] unsigned(byte[] b) {
        return b.length > 1 && b[0] == 0 ? java.util.Arrays.copyOfRange(b, 1, b.length) : b;
    }

    @BeforeEach
    void setUp() throws Exception {
        body = "{\"keys\":[" + jwk("k1") + "]}";
        provider =
                new HttpJwksKeyProvider(
                        () -> {
                            fetches.incrementAndGet();
                            if (failing) {
                                throw new IOException("down");
                            }
                            return body;
                        },
                        new ObjectMapper(),
                        now::get);
    }

    @Test
    void givenEmptyCache_whenResolving_thenFetchesOnceAndCaches() {
        assertNotNull(provider.resolve("k1"));
        assertNotNull(provider.resolve("k1"));

        assertEquals(1, fetches.get());
    }

    @Test
    void givenRotatedKey_whenKidUnknownAfterCooldown_thenRefetches() throws Exception {
        provider.resolve("k1");
        body = "{\"keys\":[" + jwk("k1") + "," + jwk("k2") + "]}";
        now.addAndGet(cooldown());

        assertNotNull(provider.resolve("k2"));
        assertEquals(2, fetches.get());
    }

    @Test
    void givenUnknownKid_whenRepeatedWithinCooldown_thenFetchesOnlyOnce() {
        assertThrows(JwtException.class, () -> provider.resolve("nope"));
        assertThrows(JwtException.class, () -> provider.resolve("nope2"));
        assertThrows(JwtException.class, () -> provider.resolve("nope3"));

        assertEquals(1, fetches.get());
    }

    @Test
    void givenFetchFailure_whenResolvingKnownKid_thenStaleKeyStillServed() {
        provider.resolve("k1");
        failing = true;
        now.addAndGet(cooldown());

        assertThrows(JwtException.class, () -> provider.resolve("k2"));
        assertNotNull(provider.resolve("k1"));
        assertEquals(2, fetches.get());
    }

    @Test
    void givenBlankKid_whenResolving_thenRejectedWithoutFetching() {
        assertThrows(JwtException.class, () -> provider.resolve(" "));
        assertThrows(JwtException.class, () -> provider.resolve(null));

        assertEquals(0, fetches.get());
    }

    @Test
    void givenMalformedDocument_whenResolving_thenRejected() {
        body = "not json";

        assertThrows(JwtException.class, () -> provider.resolve("k1"));
    }

    @Test
    void givenNonRsaAndKidlessKeys_whenResolving_thenSkipped() throws Exception {
        body = "{\"keys\":[{\"kty\":\"EC\",\"kid\":\"ec\"},{\"kty\":\"RSA\"}," + jwk("k1") + "]}";

        assertNotNull(provider.resolve("k1"));
        assertThrows(JwtException.class, () -> provider.resolve("ec"));
    }

    @Test
    void givenInterruptedFetch_whenResolving_thenRejectedAndInterruptFlagKept() {
        HttpJwksKeyProvider interrupted =
                new HttpJwksKeyProvider(
                        () -> {
                            throw new InterruptedException("stop");
                        },
                        new ObjectMapper(),
                        now::get);

        try {
            assertThrows(JwtException.class, () -> interrupted.resolve("k1"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void givenJwksEndpoint_whenResolvingThroughAppConfig_thenFetchesOverHttp() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        byte[] ok = body.getBytes(StandardCharsets.UTF_8);
        server.createContext(
                "/ok",
                exchange -> {
                    exchange.sendResponseHeaders(200, ok.length);
                    exchange.getResponseBody().write(ok);
                    exchange.close();
                });
        server.createContext(
                "/down",
                exchange -> {
                    exchange.sendResponseHeaders(503, -1);
                    exchange.close();
                });
        server.start();
        try {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();

            assertNotNull(
                    new HttpJwksKeyProvider(config(base + "/ok"), new ObjectMapper())
                            .resolve("k1"));
            assertThrows(
                    JwtException.class,
                    () ->
                            new HttpJwksKeyProvider(config(base + "/down"), new ObjectMapper())
                                    .resolve("k1"));
        } finally {
            server.stop(0);
        }
    }

    private static AppConfig config(String jwksUrl) {
        AppConfig config = new AppConfig();
        config.getJwt().setJwksUrl(jwksUrl);
        return config;
    }

    private static long cooldown() {
        return 30_000;
    }
}
