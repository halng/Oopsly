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

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.UnsupportedJwtException;
import java.security.Key;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Verifies RS256 access tokens issued by the auth service against its published JWKS; this service
 * never issues tokens.
 */
@Component
@RequiredArgsConstructor
public class JwtVerifier {
    private static final String ALGORITHM = "RS256";

    private final JwksKeyProvider keyProvider;

    private final LocatorAdapter<Key> keyLocator =
            new LocatorAdapter<>() {
                @Override
                protected Key locate(JwsHeader header) {
                    if (!ALGORITHM.equals(header.getAlgorithm())) {
                        throw new UnsupportedJwtException("Only RS256 tokens are accepted");
                    }
                    return keyProvider.resolve(header.getKeyId());
                }
            };

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractUserId(String token) {
        return extractClaim(token, claims -> claims.get("id", String.class));
    }

    public String extractUserRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /** Subscription plan claim; null for tokens issued before plans existed. */
    public String extractPlan(String token) {
        return extractClaim(token, claims -> claims.get("plan", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    /** Parses and verifies signature and expiry; throws a JwtException when invalid. */
    private Claims extractAllClaims(String token) {
        return Jwts.parser().keyLocator(keyLocator).build().parseSignedClaims(token).getPayload();
    }
}
