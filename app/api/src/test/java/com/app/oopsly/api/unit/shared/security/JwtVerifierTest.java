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
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.app.oopsly.api.shared.security.JwksKeyProvider;
import com.app.oopsly.api.shared.security.JwtVerifier;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class JwtVerifierTest {
    private final KeyPair pair = rsa();
    private final JwksKeyProvider provider =
            kid -> {
                if (!"k1".equals(kid)) {
                    throw new JwtException("Unknown signing key id");
                }
                return (RSAPublicKey) pair.getPublic();
            };
    private final JwtVerifier verifier = new JwtVerifier(provider);

    private static KeyPair rsa() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
            g.initialize(2048);
            return g.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String rs256(String kid, long expiresInMs) {
        var builder = Jwts.builder();
        if (kid != null) {
            builder.header().keyId(kid);
        }
        return builder.subject("a@b.c")
                .claim("id", "u-1")
                .claim("role", "USER")
                .claim("plan", "PRO")
                .expiration(new Date(System.currentTimeMillis() + expiresInMs))
                .signWith(pair.getPrivate(), Jwts.SIG.RS256)
                .compact();
    }

    @Test
    void givenValidRs256Token_whenExtracting_thenClaimsAreReturned() {
        String token = rs256("k1", 60_000);

        assertEquals("a@b.c", verifier.extractEmail(token));
        assertEquals("u-1", verifier.extractUserId(token));
        assertEquals("USER", verifier.extractUserRole(token));
        assertEquals("PRO", verifier.extractPlan(token));
    }

    @Test
    void givenExpiredToken_whenExtracting_thenRejected() {
        String token = rs256("k1", -60_000);

        assertThrows(JwtException.class, () -> verifier.extractUserId(token));
    }

    @Test
    void givenUnknownKid_whenExtracting_thenRejected() {
        assertThrows(JwtException.class, () -> verifier.extractUserId(rs256("other", 60_000)));
    }

    @Test
    void givenMissingKid_whenExtracting_thenRejected() {
        assertThrows(JwtException.class, () -> verifier.extractUserId(rs256(null, 60_000)));
    }

    @Test
    void givenHmacToken_whenExtracting_thenRejected() {
        SecretKey key = Keys.hmacShaKeyFor(new byte[48]);
        String token =
                Jwts.builder()
                        .header()
                        .keyId("k1")
                        .and()
                        .claim("id", "u-1")
                        .signWith(key)
                        .compact();

        assertThrows(JwtException.class, () -> verifier.extractUserId(token));
    }

    @Test
    void givenUnsignedToken_whenExtracting_thenRejected() {
        String token = Jwts.builder().header().keyId("k1").and().claim("id", "u-1").compact();

        assertThrows(JwtException.class, () -> verifier.extractUserId(token));
    }

    @Test
    void givenTamperedPayload_whenExtracting_thenRejected() {
        String[] parts = rs256("k1", 60_000).split("\\.");
        String forged =
                Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString("{\"id\":\"admin\"}".getBytes());

        assertThrows(
                JwtException.class,
                () -> verifier.extractUserId(parts[0] + "." + forged + "." + parts[2]));
    }
}
