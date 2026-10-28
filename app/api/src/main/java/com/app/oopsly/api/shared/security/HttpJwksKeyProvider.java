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

package com.app.oopsly.api.shared.security;

import com.app.oopsly.api.config.AppConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.function.LongSupplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Reads the auth service's JWKS into an in-memory cache. The first lookup fetches the set; an
 * unknown key id triggers a refetch (rotation) at most once per cooldown. A failed fetch keeps the
 * keys already cached.
 */
@Component
public class HttpJwksKeyProvider implements JwksKeyProvider {
    private static final Logger LOGGER = LoggerFactory.getLogger(HttpJwksKeyProvider.class);
    static final long REFETCH_COOLDOWN_MS = 30_000;

    /** Downloads the raw JWKS document. */
    @FunctionalInterface
    public interface Fetcher {
        String fetch() throws IOException, InterruptedException;
    }

    private final Fetcher fetcher;
    private final ObjectMapper objectMapper;
    private final LongSupplier clock;
    private volatile Map<String, RSAPublicKey> keys = Map.of();
    private boolean attempted;
    private long lastAttemptMs;

    @Autowired
    public HttpJwksKeyProvider(AppConfig appConfig, ObjectMapper objectMapper) {
        this(httpFetcher(appConfig.getJwt().getJwksUrl()), objectMapper, System::currentTimeMillis);
    }

    public HttpJwksKeyProvider(Fetcher fetcher, ObjectMapper objectMapper, LongSupplier clock) {
        this.fetcher = fetcher;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public RSAPublicKey resolve(String kid) {
        if (kid == null || kid.isBlank()) {
            throw new JwtException("Token has no key id");
        }
        RSAPublicKey key = keys.get(kid);
        if (key == null) {
            refresh();
            key = keys.get(kid);
        }
        if (key == null) {
            throw new JwtException("Unknown signing key id");
        }
        return key;
    }

    private synchronized void refresh() {
        long now = clock.getAsLong();
        if (attempted && now - lastAttemptMs < REFETCH_COOLDOWN_MS) {
            return;
        }
        attempted = true;
        lastAttemptMs = now;
        try {
            keys = parse(fetcher.fetch());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOGGER.warn("JWKS fetch interrupted; keeping cached keys");
        } catch (Exception e) {
            LOGGER.warn("JWKS fetch failed; keeping cached keys: {}", e.getMessage());
        }
    }

    private Map<String, RSAPublicKey> parse(String body) throws Exception {
        Map<String, RSAPublicKey> parsed = new HashMap<>();
        KeyFactory factory = KeyFactory.getInstance("RSA");
        Base64.Decoder decoder = Base64.getUrlDecoder();
        for (JsonNode jwk : objectMapper.readTree(body).path("keys")) {
            String kid = jwk.path("kid").asText("");
            if (kid.isEmpty() || !"RSA".equals(jwk.path("kty").asText())) {
                continue;
            }
            BigInteger n = new BigInteger(1, decoder.decode(jwk.path("n").asText()));
            BigInteger e = new BigInteger(1, decoder.decode(jwk.path("e").asText()));
            parsed.put(kid, (RSAPublicKey) factory.generatePublic(new RSAPublicKeySpec(n, e)));
        }
        return Map.copyOf(parsed);
    }

    private static Fetcher httpFetcher(String url) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        return () -> {
            HttpRequest request =
                    HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(5)).build();
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IOException("JWKS endpoint answered " + response.statusCode());
            }
            return response.body();
        };
    }
}
