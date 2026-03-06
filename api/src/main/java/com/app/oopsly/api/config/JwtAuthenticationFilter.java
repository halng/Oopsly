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

package com.app.oopsly.api.config;

import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger LOGGER = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final JwtUtils jwtUtils;
    private final ObjectMapper objectMapper;

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
        LOGGER.info("Filtering request: {}", request.getRequestURI());
        final String authHeader = request.getHeader("authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            LOGGER.warn("Authorization header not present");
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        try {
            LOGGER.info("Attempting to authenticate using jwt");
            String userId = jwtUtils.extractUserId(jwt);
            String userRole = jwtUtils.extractUserRole(jwt);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userId, null, List.of((GrantedAuthority) () -> userRole));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                LOGGER.info("User {} authenticated with role {}", userId, userRole);
            }
            filterChain.doFilter(request, response);
        } catch (Exception e) {
            LOGGER.error(
                    "JWT authentication failed with exception {} and message: {}",
                    e.getClass().getSimpleName(),
                    e.getMessage());
            sendErrorResponse(response, "EXPIRED_OR_INVALID_JWT");
        } finally {
            MDC.clear();
        }
    }

    private void sendErrorResponse(HttpServletResponse response, String message)
            throws IOException {
        LOGGER.info("Sending error response: {}", message);
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
