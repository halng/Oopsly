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

package com.app.oopsly.api.unit.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.config.JwtAuthenticationFilter;
import com.app.oopsly.api.util.JwtUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtUtils jwtUtils;

    @Mock private ObjectMapper objectMapper;

    @Mock private HttpServletRequest request;

    @Mock private HttpServletResponse response;

    @Mock private FilterChain filterChain;

    @InjectMocks private JwtAuthenticationFilter jwtAuthenticationFilter;

    @AfterEach
    void tearDown() {
        // Critical: Clear context after each test to avoid pollution
        SecurityContextHolder.clearContext();
    }

    @BeforeEach
    void setup() throws JsonProcessingException {
        lenient().when(request.getHeader("X-Request-ID")).thenReturn("test-request-id");
        lenient().when(request.getHeader("X-Platform")).thenReturn("test-platform");
        lenient().when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    @Test
    @DisplayName("Should pass through filter chain when Authorization header is missing")
    void doFilterInternal_MissingHeader() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("authorization")).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils); // Should not try to parse anything
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Should pass through filter chain when Authorization header format is invalid")
    void doFilterInternal_InvalidHeaderFormat() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("authorization")).thenReturn("Basic 123456");

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Should authenticate user when Token is valid and Context is empty")
    void doFilterInternal_ValidToken_NewAuth() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String userId = "user123";
        String role = "ROLE_USER";

        when(request.getHeader("authorization")).thenReturn("Bearer " + token);
        when(jwtUtils.extractUserId(token)).thenReturn(userId);
        when(jwtUtils.extractUserRole(token)).thenReturn(role);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals(userId, auth.getPrincipal());

        // Verify authority/role was set correctly
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(role)));

        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should NOT re-authenticate if SecurityContext already has authentication")
    void doFilterInternal_UserAlreadyAuthenticated() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String userId = "user123";
        String role = "ROLE_USER";

        when(request.getHeader("authorization")).thenReturn("Bearer " + token);
        when(jwtUtils.extractUserId(token)).thenReturn(userId);
        when(jwtUtils.extractUserRole(token)).thenReturn(role);

        // Simulate existing login
        Authentication existingAuth = mock(Authentication.class);
        SecurityContextHolder.getContext().setAuthentication(existingAuth);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        // We expect jwtUtils to be called to get the token parts...
        // BUT strictly speaking, your code extracts ID/Role BEFORE checking context.
        // So jwtUtils verify is okay.

        // Critical check: Ensure the context STILL holds the old auth, not a new one
        assertSame(existingAuth, SecurityContextHolder.getContext().getAuthentication());

        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should not authenticate if userId extraction returns null (Invalid Token)")
    void doFilterInternal_InvalidToken_NullUserId() throws ServletException, IOException {
        // Arrange
        String token = "invalid.token";
        when(request.getHeader("authorization")).thenReturn("Bearer " + token);
        when(jwtUtils.extractUserId(token)).thenReturn(null); // Simulate extraction fail

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should handle empty Bearer token gracefully")
    void doFilterInternal_EmptyBearerToken() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("authorization")).thenReturn("Bearer ");

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Should handle Bearer with extra spaces")
    void doFilterInternal_BearerWithSpaces() throws ServletException, IOException {
        // Arrange
        String tokenWithLeadingSpace = " token"; // token with leading space
        when(request.getHeader("authorization"))
                .thenReturn(
                        "Bearer "
                                + tokenWithLeadingSpace); // Results in "Bearer  token" with double
        // space
        when(jwtUtils.extractUserId(tokenWithLeadingSpace))
                .thenThrow(new RuntimeException("Invalid token"));

        // Mock the response writer for error handling
        java.io.PrintWriter writer = mock(java.io.PrintWriter.class);
        when(response.getWriter()).thenReturn(writer);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert - Should send error response
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(writer).write(anyString());
        verifyNoInteractions(filterChain);
    }

    @Test
    @DisplayName("Should handle null role from JWT")
    void doFilterInternal_NullRole() throws ServletException, IOException {
        // Arrange
        String token = "valid.token";
        String userId = "user123";

        when(request.getHeader("authorization")).thenReturn("Bearer " + token);
        when(jwtUtils.extractUserId(token)).thenReturn(userId);
        when(jwtUtils.extractUserRole(token)).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals(userId, auth.getPrincipal());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should handle filterChain exception")
    void doFilterInternal_FilterChainException() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("authorization")).thenReturn(null);
        doThrow(new ServletException("Chain error")).when(filterChain).doFilter(request, response);

        // Act & Assert
        assertThrows(
                ServletException.class,
                () -> jwtAuthenticationFilter.doFilter(request, response, filterChain));
    }

    @Test
    @DisplayName("Should handle different Bearer case variations")
    void doFilterInternal_BearerCaseInsensitive() throws ServletException, IOException {
        // Arrange - lowercase bearer
        when(request.getHeader("authorization")).thenReturn("bearer token");

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert - Should not process lowercase bearer
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtils);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternal_skipsErrorWriteWhenResponseCommitted() throws Exception {
        when(request.getHeader("authorization")).thenReturn("Bearer bad");
        when(jwtUtils.extractUserId("bad")).thenThrow(new RuntimeException("invalid"));
        when(response.isCommitted()).thenReturn(true);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(response, never()).getWriter();
        verifyNoInteractions(filterChain);
    }
}
