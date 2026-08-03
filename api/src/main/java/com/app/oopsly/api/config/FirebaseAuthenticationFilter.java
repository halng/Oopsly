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

import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger LOGGER =
            LoggerFactory.getLogger(FirebaseAuthenticationFilter.class);

    private final ObjectMapper objectMapper;
    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        final String requestId = request.getHeader("X-Request-ID");
        final String requestPlatform = request.getHeader("X-Platform");
        MDC.put("XID", requestId);
        MDC.put("XP", requestPlatform);

        try {
            final String authHeader = request.getHeader("authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            final String idToken = authHeader.substring(7);
            final FirebaseToken token = firebaseTokenVerifier.verify(idToken);
            final User user =
                    userRepository
                            .findByFirebaseUid(token.getUid())
                            .orElseGet(() -> provisionFirebaseUser(token));

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                user.getId().toString(),
                                null,
                                List.of((GrantedAuthority) () -> "ROLE_USER"));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            LOGGER.error(
                    "Firebase authentication failed with exception {} and message: {}",
                    e.getClass().getSimpleName(),
                    e.getMessage());
            sendErrorResponse(response, "EXPIRED_OR_INVALID_FIREBASE_TOKEN");
        } finally {
            MDC.clear();
        }
    }

    private User provisionFirebaseUser(FirebaseToken token) {
        String email = token.getEmail();
        if (email == null || email.isBlank()) {
            email = token.getUid() + "@phone.firebase";
        }
        final String resolvedEmail = email;

        return userRepository
                .findByEmail(resolvedEmail)
                .map(
                        existing -> {
                            existing.setFirebaseUid(token.getUid());
                            return userRepository.save(existing);
                        })
                .orElseGet(
                        () -> {
                            User user =
                                    User.builder()
                                            .firebaseUid(token.getUid())
                                            .email(resolvedEmail)
                                            .phone((String) token.getClaims().get("phone_number"))
                                            .displayName(token.getName())
                                            .build();
                            return userRepository.save(user);
                        });
    }

    private void sendErrorResponse(HttpServletResponse response, String message)
            throws IOException {
        if (response.isCommitted()) {
            LOGGER.warn("Response already committed; skipping error response write");
            return;
        }

        ApiRes apiRes = ApiRes.unauthorized(message);
        response.setStatus(apiRes.getStatusCode().value());
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(apiRes.getBody()));
    }
}
