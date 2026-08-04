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

import com.app.oopsly.api.config.FirebaseAuthenticationFilter;
import com.app.oopsly.api.config.FirebaseTokenVerifier;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class FirebaseAuthenticationFilterTest {

    @Mock private ObjectMapper objectMapper;
    @Mock private FirebaseTokenVerifier firebaseTokenVerifier;
    @Mock private UserRepository userRepository;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;

    @InjectMocks private FirebaseAuthenticationFilter firebaseAuthenticationFilter;

    @AfterEach
    void tearDown() {
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
        when(request.getHeader("authorization")).thenReturn(null);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(firebaseTokenVerifier);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Should pass through filter chain when Authorization header format is invalid")
    void doFilterInternal_InvalidHeaderFormat() throws ServletException, IOException {
        when(request.getHeader("authorization")).thenReturn("Basic 123456");

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(firebaseTokenVerifier);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Should authenticate user when Firebase token is valid and context is empty")
    void doFilterInternal_ValidToken_NewAuth() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setFirebaseUid("uid-1");
        user.setEmail("user@oopsly.com");

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-1");
        when(userRepository.findByFirebaseUid("uid-1")).thenReturn(Optional.of(user));

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals(userId.toString(), auth.getPrincipal());
        assertTrue(
                auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should send unauthorized response when Firebase token verification fails")
    void doFilterInternal_InvalidToken() throws Exception {
        when(request.getHeader("authorization")).thenReturn("Bearer bad-token");
        when(firebaseTokenVerifier.verify("bad-token")).thenThrow(new RuntimeException("invalid"));

        java.io.PrintWriter writer = mock(java.io.PrintWriter.class);
        when(response.getWriter()).thenReturn(writer);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(writer).write(anyString());
        verifyNoInteractions(filterChain);
    }

    @Test
    @DisplayName("Should provision new user when firebase uid not found and email exists")
    void doFilterInternal_ProvisionUser_ExistingEmail() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        UUID userId = UUID.randomUUID();
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail("existing@oopsly.com");

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-new");
        when(token.getEmail()).thenReturn("existing@oopsly.com");
        when(userRepository.findByFirebaseUid("uid-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("existing@oopsly.com"))
                .thenReturn(Optional.of(existingUser));
        when(userRepository.save(existingUser)).thenReturn(existingUser);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(userRepository).save(existingUser);
        assertEquals("uid-new", existingUser.getFirebaseUid());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should provision brand new user when firebase uid and email not found")
    void doFilterInternal_ProvisionUser_NewUser() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-brand-new");
        when(token.getEmail()).thenReturn("new@oopsly.com");
        when(token.getName()).thenReturn("New User");
        when(token.getClaims()).thenReturn(java.util.Map.of());
        when(userRepository.findByFirebaseUid("uid-brand-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@oopsly.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(userRepository).save(any(User.class));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should use phone.firebase email when token email is null")
    void doFilterInternal_ProvisionUser_NullEmail() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-phone");
        when(token.getEmail()).thenReturn(null);
        when(token.getName()).thenReturn("Phone User");
        when(token.getClaims()).thenReturn(java.util.Map.of("phone_number", "+15551234567"));
        when(userRepository.findByFirebaseUid("uid-phone")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("uid-phone@phone.firebase")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(userRepository).findByEmail("uid-phone@phone.firebase");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should use phone.firebase email when token email is blank")
    void doFilterInternal_ProvisionUser_BlankEmail() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-blank");
        when(token.getEmail()).thenReturn("   ");
        when(token.getName()).thenReturn(null);
        when(token.getClaims()).thenReturn(java.util.Map.of());
        when(userRepository.findByFirebaseUid("uid-blank")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("uid-blank@phone.firebase")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(userRepository).findByEmail("uid-blank@phone.firebase");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should skip error response when response is already committed")
    void doFilterInternal_ResponseCommitted() throws Exception {
        when(request.getHeader("authorization")).thenReturn("******");
        when(firebaseTokenVerifier.verify("bad-token")).thenThrow(new RuntimeException("expired"));
        when(response.isCommitted()).thenReturn(true);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        verify(response, never()).setStatus(anyInt());
        verify(response, never()).getWriter();
        verifyNoInteractions(filterChain);
    }

    @Test
    @DisplayName("Should skip authentication when SecurityContext is already set")
    void doFilterInternal_SecurityContextAlreadySet() throws Exception {
        String idToken = "valid.firebase.token";
        FirebaseToken token = mock(FirebaseToken.class);
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setFirebaseUid("uid-1");

        when(request.getHeader("authorization")).thenReturn("Bearer " + idToken);
        when(firebaseTokenVerifier.verify(idToken)).thenReturn(token);
        when(token.getUid()).thenReturn("uid-1");
        when(userRepository.findByFirebaseUid("uid-1")).thenReturn(Optional.of(user));

        UsernamePasswordAuthenticationToken existingAuth =
                new UsernamePasswordAuthenticationToken("existing-user", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(existingAuth);

        firebaseAuthenticationFilter.doFilter(request, response, filterChain);

        assertEquals(
                "existing-user",
                SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(filterChain).doFilter(request, response);
    }
}
