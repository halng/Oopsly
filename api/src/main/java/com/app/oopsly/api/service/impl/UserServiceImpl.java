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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.AuthRes;
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
    }

    @Cacheable(value = "users", key = "#root.methodName + ':' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "getCurrentUserFallback")
    @Override
    public User getCurrentUser() {
        String currentUserId = getCurrentUserId();
        return userRepository
                .findById(UUID.fromString(currentUserId))
                .orElseThrow(() -> new UnauthenticatedException("User not found"));
    }

    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "refreshTokenFallback")
    @Override
    public ApiRes refreshToken(RefreshTokenReq refreshTokenReq) {
        log.info(
                "Processing refresh token request for user {}",
                StringUtils.masked(refreshTokenReq.userEmail()));

        String email = refreshTokenReq.userEmail();
        String userId = refreshTokenReq.userId();
        String providedRefreshToken = refreshTokenReq.refreshToken();

        if (!jwtUtils.isTokenValid(providedRefreshToken, email)) {
            log.warn(
                    "Invalid refresh token for user {}",
                    StringUtils.masked(refreshTokenReq.userEmail()));
            return ApiRes.unauthorized("Invalid or expired refresh token");
        }

        String storedRefreshToken =
                stringRedisTemplate.opsForValue().get(Constant.REFRESH_TOKEN_REDIS_KEY + userId);

        if (storedRefreshToken == null || !storedRefreshToken.equals(providedRefreshToken)) {
            log.warn(
                    "Refresh token mismatch for user {}",
                    StringUtils.masked(refreshTokenReq.userEmail()));
            return ApiRes.unauthorized("Invalid refresh token");
        }

        User user =
                userRepository
                        .findById(UUID.fromString(userId))
                        .orElseThrow(
                                () ->
                                        new UnauthenticatedException(
                                                "User not found with ID: " + userId));

        if (!user.getEmail().equals(email)) {
            log.warn("Email mismatch for user ID {}", userId);
            return ApiRes.unauthorized("Invalid user credentials");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId());
        claims.put("role", "USER");

        String newAccessToken = jwtUtils.generateTokenWithClaims(claims, email);
        String newRefreshToken = jwtUtils.generateRefreshToken(email);

        String refreshTokenKey = Constant.REFRESH_TOKEN_REDIS_KEY + userId;
        stringRedisTemplate
                .opsForValue()
                .set(
                        refreshTokenKey,
                        newRefreshToken,
                        Constant.REFRESH_TOKEN_EXPIRATION_DAYS,
                        TimeUnit.DAYS);

        log.info("Successfully refreshed tokens for user {}", StringUtils.masked(email));

        AuthRes authRes = new AuthRes(newAccessToken, newRefreshToken, Constant.TOKEN_TYPE_BEARER);
        return ApiRes.ok("Token refreshed successfully", authRes);
    }

    public User getCurrentUserFallback(Throwable t) {
        throw new UnauthenticatedException(
                "User service is currently unavailable. Please try again later.", t);
    }

    public ApiRes refreshTokenFallback(RefreshTokenReq refreshTokenReq, Throwable t) {
        log.error(
                "Refresh token service unavailable for user {}: {}",
                StringUtils.masked(refreshTokenReq.userEmail()),
                t.getMessage());
        throw new RuntimeException(
                "Refresh token service is currently unavailable. Please try again later.", t);
    }

    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "logoutFallback")
    @Override
    public ApiRes logout() {
        String userId = getCurrentUserId();
        log.info("Processing logout request for user ID: {}", userId);

        String refreshTokenKey = Constant.REFRESH_TOKEN_REDIS_KEY + userId;
        Boolean deleted = stringRedisTemplate.delete(refreshTokenKey);

        if (Boolean.TRUE.equals(deleted)) {
            log.info("Successfully logged out user: {}", userId);
            return ApiRes.ok("Logged out successfully");
        } else {
            log.warn("No refresh token found for user: {}", userId);
            return ApiRes.ok("Logged out successfully");
        }
    }

    public ApiRes logoutFallback(Throwable t) {
        log.error("Logout service unavailable: {}", t.getMessage());
        throw new RuntimeException(
                "Logout service is currently unavailable. Please try again later.", t);
    }
}
