/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.app.osmosis.api.config.AppConfig;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.service.impl.JwtServiceImpl;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwtServiceImplTest {

    @Test
    void generateToken_createsValidJwt_withSubjectAsEmail() {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Jwt jwtCfg = mock(AppConfig.Jwt.class);
        when(appConfig.getJwt()).thenReturn(jwtCfg);

        // secret must be long enough for HS256 keys
        String secret = "very-secret-key-which-is-long-enough-to-be-safe-12345";
        when(jwtCfg.getSecret()).thenReturn(secret);
        when(jwtCfg.getExpirationInMs()).thenReturn(60_000L);

        JwtServiceImpl svc = new JwtServiceImpl(appConfig);

        User user = User.builder().email("u@example.com").build();
        String token = svc.generateToken(user);

        assertNotNull(token);
        // parse using same key to verify claims
        var parsed =
                Jwts.parser()
                        .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                        .build()
                        .parseClaimsJws(token);

        assertEquals("u@example.com", parsed.getBody().getSubject());
        assertTrue(parsed.getBody().getExpiration().after(new Date()));
    }

    @Test
    void validateToken_returnsSubject_whenTokenIsValid() {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Jwt jwtCfg = mock(AppConfig.Jwt.class);
        when(appConfig.getJwt()).thenReturn(jwtCfg);

        String secret = "another-very-secret-key-that-is-long-enough-67890";
        when(jwtCfg.getSecret()).thenReturn(secret);
        when(jwtCfg.getExpirationInMs()).thenReturn(60_000L);

        JwtServiceImpl svc = new JwtServiceImpl(appConfig);
        User user = User.builder().email("tester@example.com").build();
        String token = svc.generateToken(user);

        String subject = svc.validateToken(token);
        assertEquals("tester@example.com", subject);

        String extracted = svc.extractUserId(token);
        assertEquals("tester@example.com", extracted);
    }

    @Test
    void validateToken_returnsNull_forTamperedToken() {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Jwt jwtCfg = mock(AppConfig.Jwt.class);
        when(appConfig.getJwt()).thenReturn(jwtCfg);

        String secret = "secret-for-tamper-test-000000000000000";
        when(jwtCfg.getSecret()).thenReturn(secret);
        when(jwtCfg.getExpirationInMs()).thenReturn(60_000L);

        JwtServiceImpl svc = new JwtServiceImpl(appConfig);
        User user = User.builder().email("t@example.com").build();
        String token = svc.generateToken(user);

        // tamper token
        String tampered = token + "x";

        assertNull(svc.validateToken(tampered));
    }

    @Test
    void validateToken_returnsNull_forExpiredToken() throws InterruptedException {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Jwt jwtCfg = mock(AppConfig.Jwt.class);
        when(appConfig.getJwt()).thenReturn(jwtCfg);

        String secret = "secret-for-expire-test-000000000000000";
        when(jwtCfg.getSecret()).thenReturn(secret);
        // very short expiration so token is effectively expired
        when(jwtCfg.getExpirationInMs()).thenReturn(-1L);

        JwtServiceImpl svc = new JwtServiceImpl(appConfig);
        User user = User.builder().email("e@example.com").build();
        String token = svc.generateToken(user);

        assertNull(svc.validateToken(token));
    }
    @Test
    void validateToken_handlesNullAndEmptyInputs() {

        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Jwt jwtCfg = mock(AppConfig.Jwt.class);
        when(appConfig.getJwt()).thenReturn(jwtCfg);
        when(jwtCfg.getSecret()).thenReturn("some-long-secret-for-null-test-000");
        when(jwtCfg.getExpirationInMs()).thenReturn(1000L);

        JwtServiceImpl svc = new JwtServiceImpl(appConfig);
        assertNull(svc.validateToken(null));
        assertNull(svc.validateToken(""));
        assertNull(svc.extractUserId(null));
    }
}
