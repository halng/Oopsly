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

package com.app.osmosis.api.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.osmosis.api.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock HttpServletRequest request;

    @Mock HttpServletResponse response;

    @Mock FilterChain filterChain;

    @Mock JwtService jwtService;

    @Mock UserDetailsService userDetailsService;

    @Mock UserDetails userDetails;

    @InjectMocks JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void
            givenJwtAuthenticationFilter_withNoAuthorizationHeader_thenChainCalledAndNoAuthenticationSet()
                    throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtService, userDetailsService);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void
            givenJwtAuthenticationFilter_withInvalidAuthorizationPrefix_thenChainCalledAndNoAuthenticationSet()
                    throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Token abcdef");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtService, userDetailsService);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void givenJwtAuthenticationFilter_withBearerButNoUserId_thenChainCalledAndNoAuthenticationSet()
            throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token123");
        when(jwtService.extractUserId("token123")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(jwtService).extractUserId("token123");
        verifyNoInteractions(userDetailsService);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void givenJwtAuthenticationFilter_withValidToken_thenAuthenticationSetAndChainCalled()
            throws Exception {
        String token = "token123";
        String userEmail = "user@example.com";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extractUserId(token)).thenReturn(userEmail);
        when(userDetailsService.loadUserByUsername(userEmail)).thenReturn(userDetails);
        when(userDetails.getAuthorities()).thenReturn(Collections.emptyList());

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(jwtService).extractUserId(token);
        verify(userDetailsService).loadUserByUsername(userEmail);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(
                SecurityContextHolder.getContext().getAuthentication()
                        instanceof UsernamePasswordAuthenticationToken);
        UsernamePasswordAuthenticationToken auth =
                (UsernamePasswordAuthenticationToken)
                        SecurityContextHolder.getContext().getAuthentication();
        assertEquals(userDetails, auth.getPrincipal());
        assertEquals(null, auth.getCredentials());
        assertEquals(0, auth.getAuthorities().size());
    }

    @Test
    void givenJwtAuthenticationFilter_withExistingAuthentication_thenDoesNotLoadUserDetails()
            throws Exception {
        // Pre-set an authentication
        UsernamePasswordAuthenticationToken existing =
                new UsernamePasswordAuthenticationToken(
                        "existing", null, List.of(() -> "ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(existing);

        when(request.getHeader("Authorization")).thenReturn("Bearer token123");
        when(jwtService.extractUserId("token123")).thenReturn("user@example.com");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(jwtService).extractUserId("token123");
        verify(userDetailsService, never()).loadUserByUsername(anyString());
        // authentication unchanged
        assertSame(existing, SecurityContextHolder.getContext().getAuthentication());
    }
}
