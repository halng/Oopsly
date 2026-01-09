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

package com.app.oopsly.api.util;

import com.app.oopsly.api.config.AppConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import javax.crypto.SecretKey;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class JwtUtils {
    private final AppConfig appConfig;

    /** 1. GENERATE TOKEN Generates a token for the user with default claims */
    public String generateAccessToken(String email) {
        return buildToken(new HashMap<>(), email, appConfig.getJwt().getExpirationInMs());
    }

    /**
     * 1b. GENERATE TOKEN (With Extra Claims) Use this if you want to store Roles, UserID, etc.
     * inside the token
     */
    public String generateTokenWithClaims(Map<String, Object> extraClaims, String email) {
        return buildToken(extraClaims, email, appConfig.getJwt().getExpirationInMs());
    }

    public String generateRefreshToken(String email) {
        return buildToken(new HashMap<>(), email, appConfig.getJwt().getRefreshExpirationInMs());
    }

    private String buildToken(
            Map<String, Object> extraClaims, String subject, long expirationInMs) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationInMs))
                .signWith(getSignInKey())
                .compact();
    }

    /** 2. VALIDATE TOKEN Checks if the token belongs to the user and is not expired */
    public boolean isTokenValid(String token, String userEmail) {
        final String username = extractEmail(token);
        return (username.equals(userEmail) && !isTokenExpired(token));
    }

    /** 3. EXTRACT EMAIL (Subject) */
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractUserId(String token) {
        return extractClaim(token, claims -> claims.get("id", String.class));
    }

    public String extractUserRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /** 4. CHECK EXPIRATION */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /** HELPER: Extract specific claim */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /** HELPER: Parse the token to get all data */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** HELPER: Decode the secret key */
    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(appConfig.getJwt().getSecret());
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
