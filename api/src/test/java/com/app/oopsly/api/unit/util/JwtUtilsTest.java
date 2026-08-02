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

package com.app.oopsly.api.unit.util;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.util.JwtUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwtUtilsTest {

    @Mock private AppConfig appConfig;

    @Mock private AppConfig.Jwt jwtConfig; // Assuming AppConfig has a nested Jwt class

    @InjectMocks private JwtUtils jwtUtils;

    // Use a real, valid 256-bit (32-byte) secret encoded in Base64
    // "12345678901234567890123456789012" -> Base64
    private final String TEST_SECRET = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";
    private final long EXPIRATION_MS = 1000 * 60 * 60; // 1 hour
    private final long REFRESH_EXPIRATION_MS = 1000 * 60 * 60 * 24; // 24 hours

    @BeforeEach
    void setUp() {
        // Mock the chain: appConfig.getJwt().getSecret() ...
        when(appConfig.getJwt()).thenReturn(jwtConfig);
        when(jwtConfig.getSecret()).thenReturn(TEST_SECRET);

        // Only verify refresh expiration if the test calls generateRefreshToken
        // (lenient mocking allows this to be skipped in some tests)
    }

    @Test
    @DisplayName("Should generate a valid access token and extract email correctly")
    void generateAccessToken_Success() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        String email = "test@example.com";

        // Act
        String token = jwtUtils.generateAccessToken(email);

        // Assert
        assertNotNull(token);
        assertFalse(token.isEmpty());

        // Verify we can read it back
        String extractedEmail = jwtUtils.extractEmail(token);
        assertEquals(email, extractedEmail);
    }

    @Test
    @DisplayName("Should generate token with extra claims (ID, Role) and extract them")
    void generateTokenWithClaims_Success() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        // Arrange
        String email = "admin@example.com";
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", "user-123");
        claims.put("role", "ADMIN");

        // Act
        String token = jwtUtils.generateTokenWithClaims(claims, email);

        // Assert
        assertEquals("user-123", jwtUtils.extractUserId(token));
        assertEquals("ADMIN", jwtUtils.extractUserRole(token));
        assertEquals(email, jwtUtils.extractEmail(token));
    }

    @Test
    @DisplayName("Should generate refresh token with correct long-term expiration")
    void generateRefreshToken_Success() {
        // Arrange
        String email = "user@example.com";
        when(jwtConfig.getRefreshExpirationInMs()).thenReturn(REFRESH_EXPIRATION_MS);

        // Act
        String token = jwtUtils.generateRefreshToken(email);

        // Assert
        Date expiration = jwtUtils.extractClaim(token, Claims::getExpiration);
        Date now = new Date();

        // Check if expiration is roughly 24 hours from now (allowing 5s buffer)
        long diff = expiration.getTime() - now.getTime();
        assertTrue(diff > REFRESH_EXPIRATION_MS - 5000 && diff < REFRESH_EXPIRATION_MS + 5000);
    }

    @Test
    @DisplayName("isTokenValid should return true for valid token and correct user")
    void isTokenValid_Success() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        String email = "valid@example.com";
        String token = jwtUtils.generateAccessToken(email);

        assertTrue(jwtUtils.isTokenValid(token, email));
    }

    @Test
    @DisplayName("isTokenValid should return false for valid token but wrong user")
    void isTokenValid_WrongUser() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        String email = "user@example.com";
        String token = jwtUtils.generateAccessToken(email);

        assertFalse(jwtUtils.isTokenValid(token, "hacker@example.com"));
    }

    @Test
    @DisplayName("Should throw ExpiredJwtException when token is expired")
    void extractClaim_ExpiredToken() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        // Arrange: Mock expiration to be in the PAST (-1000ms)
        when(jwtConfig.getExpirationInMs()).thenReturn(-1000L);
        String email = "expired@example.com";

        // Generate an immediately expired token
        String expiredToken = jwtUtils.generateAccessToken(email);

        // Act & Assert
        // JJWT throws ExpiredJwtException immediately when parsing
        assertThrows(
                ExpiredJwtException.class,
                () -> {
                    jwtUtils.extractEmail(expiredToken);
                });
    }

    @Test
    @DisplayName("Should throw MalformedJwtException for garbage token")
    void extractClaim_GarbageToken() {
        String garbageToken = "this.is.garbage";

        assertThrows(
                MalformedJwtException.class,
                () -> {
                    jwtUtils.extractEmail(garbageToken);
                });
    }

    @Test
    @DisplayName("Should throw SignatureException if token is tampered with")
    void extractClaim_TamperedToken() {
        when(jwtConfig.getExpirationInMs()).thenReturn(EXPIRATION_MS);

        // 1. Generate valid token
        String validToken = jwtUtils.generateAccessToken("user@test.com");

        // 2. Tamper with the payload (middle part)
        // JWT structure: Header.Payload.Signature
        String[] parts = validToken.split("\\.");
        String tamperedToken =
                parts[0] + ".eyJzdWIiOiJoYWNrZXIifQ." + parts[2]; // changing sub to hacker

        // 3. Parser should fail signature check
        assertThrows(
                SignatureException.class,
                () -> {
                    jwtUtils.extractEmail(tamperedToken);
                });
    }
}
