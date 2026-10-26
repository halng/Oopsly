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

package com.app.oopsly.api.shared.client;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.shared.application.vm.Res;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Reads public profile data from the auth service. Never throws for an unreachable auth service:
 * callers get {@link AuthProfile#unknown(UUID)} so leaderboard, community and stats keep working.
 */
@Slf4j
@Component
public class AuthClient {

    static final int MAX_IDS_PER_CALL = 200;
    private static final String INTERNAL_KEY_HEADER = "X-Internal-Key";
    private static final String LOOKUP_PATH = "/internal/v1/users/lookup";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalKey;
    private final Cache<UUID, AuthProfile> cache =
            Caffeine.newBuilder()
                    .maximumSize(5_000)
                    .expireAfterWrite(Duration.ofMinutes(5))
                    .build();

    public AuthClient(AppConfig appConfig, ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(1));
        factory.setReadTimeout(Duration.ofSeconds(2));
        this.restClient =
                RestClient.builder()
                        .baseUrl(appConfig.getAuth().getBaseUrl())
                        .requestFactory(factory)
                        .build();
        this.internalKey = appConfig.getAuth().getInternalKey();
        this.objectMapper = objectMapper;
    }

    /** Returns one profile per requested id, using placeholders for anything unavailable. */
    @CircuitBreaker(name = CircuitBreakerNames.AUTH_CLIENT, fallbackMethod = "lookupFallback")
    public Map<UUID, AuthProfile> lookup(Collection<UUID> ids) {
        return lookupAll(ids);
    }

    private Map<UUID, AuthProfile> lookupAll(Collection<UUID> ids) {
        Map<UUID, AuthProfile> result = new LinkedHashMap<>();
        List<UUID> missing = new ArrayList<>();
        for (UUID id : ids) {
            AuthProfile cached = cache.getIfPresent(id);
            if (cached != null) {
                result.put(id, cached);
            } else if (!missing.contains(id)) {
                missing.add(id);
            }
        }
        for (int from = 0; from < missing.size(); from += MAX_IDS_PER_CALL) {
            List<UUID> batch =
                    missing.subList(from, Math.min(from + MAX_IDS_PER_CALL, missing.size()));
            for (AuthProfile profile : fetch(batch)) {
                cache.put(profile.id(), profile);
                result.put(profile.id(), profile);
            }
        }
        for (UUID id : ids) {
            result.putIfAbsent(id, AuthProfile.unknown(id));
        }
        return result;
    }

    /**
     * Single-user variant. Annotated separately because a call from {@link #lookup(Collection)}
     * would bypass the circuit breaker proxy.
     */
    @CircuitBreaker(name = CircuitBreakerNames.AUTH_CLIENT, fallbackMethod = "lookupFallback")
    public AuthProfile lookup(UUID id) {
        return lookupAll(List.of(id)).get(id);
    }

    @SuppressWarnings("unused")
    private AuthProfile lookupFallback(UUID id, Throwable t) {
        log.warn("Auth service unavailable, using placeholder profile: {}", t.getMessage());
        AuthProfile cached = cache.getIfPresent(id);
        return cached != null ? cached : AuthProfile.unknown(id);
    }

    @SuppressWarnings("unused")
    private Map<UUID, AuthProfile> lookupFallback(Collection<UUID> ids, Throwable t) {
        log.warn("Auth service unavailable, using placeholder profiles: {}", t.getMessage());
        Map<UUID, AuthProfile> result = new LinkedHashMap<>();
        for (UUID id : ids) {
            AuthProfile cached = cache.getIfPresent(id);
            result.put(id, cached != null ? cached : AuthProfile.unknown(id));
        }
        return result;
    }

    private List<AuthProfile> fetch(List<UUID> ids) {
        Res res =
                restClient
                        .post()
                        .uri(LOOKUP_PATH)
                        .header(INTERNAL_KEY_HEADER, internalKey)
                        .body(Map.of("ids", ids))
                        .retrieve()
                        .body(Res.class);
        if (res == null || res.data() == null) {
            return List.of();
        }
        JsonNode data = objectMapper.valueToTree(res.data());
        List<AuthProfile> profiles = new ArrayList<>();
        for (JsonNode node : data) {
            profiles.add(objectMapper.convertValue(node, AuthProfile.class));
        }
        return profiles;
    }
}
