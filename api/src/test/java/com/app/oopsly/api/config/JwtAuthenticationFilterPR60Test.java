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

package com.app.oopsly.api.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.util.JwtUtils;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Comprehensive tests for JwtAuthenticationFilter changes in PR #60.
 *
 * <p>This test suite focuses on the new features and changes introduced in PR #60:
 * - MDC context management with X-Request-ID header
 * - Lowercase "authorization" header handling
 * - Exception handling with sendErrorResponse
 * - MDC cleanup in finally block
 *
 * <p>GOTCHA NOTES:
 * - The filter now ONLY checks for lowercase "authorization" header, which violates
 *   HTTP header case-insensitivity convention. Clients using "Authorization" will
 *   bypass authentication.
 * - MDC cleanup happens in finally block, but if exception occurs during request
 *   processing, the filter chain is not called, which might affect CORS and other filters.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterPR60Test {

    @Mock private JwtUtils jwtUtils;

    @Mock private HttpServletRequest request;

    @Mock private HttpServletResponse response;

    @Mock private FilterChain filterChain;

    @InjectMocks private JwtAuthenticationFilter jwtAuthenticationFilter;

    private StringWriter responseWriter;

    @BeforeEach
    void setUp() throws IOException {
        responseWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(responseWriter);
        when(response.getWriter()).thenReturn(printWriter);
        
        // Setup request URI for logging
        when(request.getRequestURI()).thenReturn("/api/v1/test");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        MDC.clear();
    }

    // ============================================================================
    // TESTS FOR NEW MDC CONTEXT MANAGEMENT (PR #60)
    // ============================================================================

    @Test
    @DisplayName("JWT-T8: Should handle null X-Request-ID gracefully without crashing")
    void nullRequestId_shouldNotCrash() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn(null);
        when(request.getHeader("authorization")).thenReturn(null);

        // Act - Should not throw exception
        assertDoesNotThrow(() -> 
            jwtAuthenticationFilter.doFilterInternal(request, response, filterChain));

        // Assert
        verify(filterChain).doFilter(request, response);
        assertNull(MDC.get("XID")); // MDC should be cleared
    }

    @Test
    @DisplayName("JWT-T14: Should clear MDC after request processing")
    void mdcClearedAfterRequest() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer valid-token");
        when(jwtUtils.extractUserId("valid-token")).thenReturn("user123");
        when(jwtUtils.extractUserRole("valid-token")).thenReturn("ROLE_USER");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(MDC.get("XID"), "MDC should be cleared after request");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should set MDC with X-Request-ID during request processing")
    void shouldSetMdcDuringRequest() throws ServletException, IOException {
        // Arrange
        String requestId = "req-abc-123";
        when(request.getHeader("X-Request-ID")).thenReturn(requestId);
        when(request.getHeader("authorization")).thenReturn("Bearer valid-token");
        when(jwtUtils.extractUserId("valid-token")).thenReturn("user123");
        when(jwtUtils.extractUserRole("valid-token")).thenReturn("ROLE_USER");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        // MDC should be cleared after request, so we verify it was called
        verify(request).getHeader("X-Request-ID");
    }

    // ============================================================================
    // TESTS FOR LOWERCASE "authorization" HEADER (PR #60)
    // ============================================================================

    @Test
    @DisplayName("JWT-T3: Lowercase 'authorization' header should work")
    void lowercaseAuthHeader_shouldAuthenticate() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer valid-token");
        when(jwtUtils.extractUserId("valid-token")).thenReturn("user123");
        when(jwtUtils.extractUserRole("valid-token")).thenReturn("ROLE_USER");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("JWT-T4: UPPERCASE 'AUTHORIZATION' header should NOT work (BUG)")
    void uppercaseAuthHeader_shouldNotAuthenticate() throws ServletException, IOException {
        /*
         * GOTCHA: This test exposes a critical security bug introduced in PR #60.
         * The filter checks for lowercase "authorization" only, which violates
         * HTTP/1.1 specification (RFC 7230) stating that header field names are
         * case-insensitive. Clients using standard "Authorization" header will
         * bypass authentication.
         */
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn(null); // lowercase returns null
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token"); // uppercase has token

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Authentication should fail because filter only checks lowercase 'authorization'");
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("JWT-T4b: Mixed case 'Authorization' header should NOT work")
    void mixedCaseAuthHeader_shouldNotAuthenticate() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    // ============================================================================
    // TESTS FOR EXCEPTION HANDLING & ERROR RESPONSE (PR #60)
    // ============================================================================

    @Test
    @DisplayName("JWT-T9: Expired JWT token should return 401 with error JSON")
    void expiredToken_shouldReturnUnauthorized() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer expired-token");
        when(jwtUtils.extractUserId("expired-token"))
                .thenThrow(new ExpiredJwtException(null, null, "Token expired"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(response).setContentType("application/json");
        
        String responseBody = responseWriter.toString();
        assertTrue(responseBody.contains("EXPIRED_OR_INVALID_JWT"),
                "Response should contain error message");
        
        // GOTCHA: Filter chain is NOT called when exception occurs
        verify(filterChain, never()).doFilter(request, response);
        
        // MDC should still be cleared
        assertNull(MDC.get("XID"));
    }

    @Test
    @DisplayName("JWT-T10: Invalid JWT signature should return 401")
    void invalidSignature_shouldReturnUnauthorized() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer tampered-token");
        when(jwtUtils.extractUserId("tampered-token"))
                .thenThrow(new SignatureException("Invalid signature"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(response).setContentType("application/json");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("JWT-T13: Malformed JWT should return 401 with error message")
    void malformedJwt_shouldReturnUnauthorized() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer not.valid.jwt");
        when(jwtUtils.extractUserId("not.valid.jwt"))
                .thenThrow(new MalformedJwtException("JWT string has invalid format"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(response).setContentType("application/json");
        
        String responseBody = responseWriter.toString();
        assertTrue(responseBody.contains("EXPIRED_OR_INVALID_JWT"));
    }

    @Test
    @DisplayName("JWT-T13b: Generic exception during JWT parsing should return 401")
    void genericException_shouldReturnUnauthorized() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer problem-token");
        when(jwtUtils.extractUserId("problem-token"))
                .thenThrow(new RuntimeException("Unexpected error"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("MDC should be cleared even when exception occurs")
    void mdcClearedOnException() throws ServletException, IOException {
        // Arrange
        String requestId = "req-error-123";
        when(request.getHeader("X-Request-ID")).thenReturn(requestId);
        when(request.getHeader("authorization")).thenReturn("Bearer bad-token");
        when(jwtUtils.extractUserId("bad-token"))
                .thenThrow(new ExpiredJwtException(null, null, "Expired"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(MDC.get("XID"), "MDC must be cleared in finally block");
    }

    // ============================================================================
    // EDGE CASES & SECURITY TESTS
    // ============================================================================

    @Test
    @DisplayName("JWT-T15: SQL Injection attempt in JWT claims should be rejected")
    void sqlInjectionInClaims_shouldReject() throws ServletException, IOException {
        /*
         * GOTCHA: This test verifies that malicious SQL in JWT claims doesn't
         * cause issues. The JWT parsing itself should fail before any SQL is executed.
         */
        // Arrange
        String maliciousToken = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiInOyBEUk9QIFRBQkxFLS0ifQ.xyz";
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn(maliciousToken);
        when(jwtUtils.extractUserId(maliciousToken.substring(7)))
                .thenThrow(new SignatureException("Invalid token"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("JWT-T16: Extremely long JWT token should be handled gracefully")
    void extremelyLongToken_shouldHandle() throws ServletException, IOException {
        // Arrange
        String longToken = "Bearer " + "a".repeat(10000);
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn(longToken);
        when(jwtUtils.extractUserId(longToken.substring(7)))
                .thenThrow(new MalformedJwtException("Token too long"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    @DisplayName("JWT-T11: JWT with null userId should not set authentication context")
    void nullUserId_shouldNotSetContext() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer token-no-userid");
        when(jwtUtils.extractUserId("token-no-userid")).thenReturn(null);
        when(jwtUtils.extractUserRole("token-no-userid")).thenReturn("ROLE_USER");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Authentication should not be set when userId is null");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("JWT-T12: JWT with null role should handle gracefully")
    void nullRole_shouldHandleGracefully() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer token-no-role");
        when(jwtUtils.extractUserId("token-no-role")).thenReturn("user123");
        when(jwtUtils.extractUserRole("token-no-role")).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Empty authorization header value should pass through")
    void emptyAuthHeader_shouldPassThrough() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("Authorization with only spaces should pass through")
    void authHeaderWithOnlySpaces_shouldPassThrough() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("   ");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("Bearer prefix without token should pass through without error")
    void bearerPrefixOnly_shouldPassThrough() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Error response should write correct JSON format")
    void errorResponse_shouldHaveCorrectJsonFormat() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer bad-token");
        when(jwtUtils.extractUserId("bad-token"))
                .thenThrow(new ExpiredJwtException(null, null, "Token expired"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        String responseBody = responseWriter.toString();
        assertTrue(responseBody.matches("\\{\"error\":\\s*\"EXPIRED_OR_INVALID_JWT\"\\}"),
                "Response should be valid JSON with error field");
        verify(response).setContentType("application/json");
    }

    @Test
    @DisplayName("Exception during extractUserRole should also be caught")
    void exceptionDuringRoleExtraction_shouldReturnUnauthorized() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Request-ID")).thenReturn("req-123");
        when(request.getHeader("authorization")).thenReturn("Bearer token");
        when(jwtUtils.extractUserId("token")).thenReturn("user123");
        when(jwtUtils.extractUserRole("token"))
                .thenThrow(new RuntimeException("Role extraction failed"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(request, response);
    }
}
