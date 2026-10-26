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

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.shared.security.JwtVerifier;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tokens are built the way the auth service builds them: HS384, base64 shared secret. */
class JwtVerifierTest {

    private static final String SECRET =
            "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86";

    private JwtVerifier verifier;
    private SecretKey key;

    @BeforeEach
    void setUp() {
        AppConfig config = new AppConfig();
        config.getJwt().setSecret(SECRET);
        verifier = new JwtVerifier(config);
        key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET));
    }

    private String token(Map<String, Object> claims, long expiresInMs) {
        return Jwts.builder()
                .claims(claims)
                .subject("learner@test.dev")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiresInMs))
                .signWith(key)
                .compact();
    }

    @Test
    void extractsIdentityAndPlanClaims() {
        String jwt = token(Map.of("id", "user-1", "role", "USER", "plan", "PRO"), 60_000);

        assertEquals("user-1", verifier.extractUserId(jwt));
        assertEquals("USER", verifier.extractUserRole(jwt));
        assertEquals("PRO", verifier.extractPlan(jwt));
        assertEquals("learner@test.dev", verifier.extractEmail(jwt));
    }

    @Test
    void tokenWithoutPlanClaim_stillVerifies() {
        String jwt = token(Map.of("id", "user-1", "role", "USER"), 60_000);

        assertEquals("user-1", verifier.extractUserId(jwt));
        assertNull(verifier.extractPlan(jwt));
    }

    @Test
    void expiredToken_isRejected() {
        String jwt = token(Map.of("id", "user-1"), -1_000);

        assertThrows(JwtException.class, () -> verifier.extractUserId(jwt));
    }

    @Test
    void tokenSignedWithAnotherSecret_isRejected() {
        SecretKey other = Keys.hmacShaKeyFor(new byte[48]);
        String jwt =
                Jwts.builder()
                        .claims(Map.of("id", "user-1"))
                        .expiration(new Date(System.currentTimeMillis() + 60_000))
                        .signWith(other)
                        .compact();

        assertThrows(JwtException.class, () -> verifier.extractUserId(jwt));
    }
}
