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

import com.app.oopsly.api.entity.Language;
import com.app.oopsly.api.entity.SettingEntity;
import com.app.oopsly.api.entity.Theme;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.SettingRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.AuthRes;
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
import com.app.oopsly.api.viewmodel.SettingsRes;
import com.app.oopsly.api.viewmodel.UpdateProfileReq;
import com.app.oopsly.api.viewmodel.UpdateSettingsReq;
import com.app.oopsly.api.viewmodel.UserProfileRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final SettingRepository settingRepository;
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
        String providedRefreshToken = refreshTokenReq.refreshToken();

        if (!jwtUtils.isTokenValid(providedRefreshToken, email)) {
            log.warn(
                    "Invalid refresh token for user {}",
                    StringUtils.masked(refreshTokenReq.userEmail()));
            return ApiRes.unauthorized("Invalid or expired refresh token");
        }

        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new UnauthenticatedException(
                                                "User not found with email: " + email));

        String storedRefreshToken =
                stringRedisTemplate
                        .opsForValue()
                        .get(Constant.REFRESH_TOKEN_REDIS_KEY + user.getId());

        if (storedRefreshToken == null || !storedRefreshToken.equals(providedRefreshToken)) {
            log.warn(
                    "Refresh token mismatch for user {}",
                    StringUtils.masked(refreshTokenReq.userEmail()));
            return ApiRes.unauthorized("Invalid refresh token");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId());
        claims.put("role", "USER");

        String newAccessToken = jwtUtils.generateTokenWithClaims(claims, email);

        log.info("Successfully refreshed tokens for user {}", StringUtils.masked(email));

        AuthRes authRes =
                new AuthRes(newAccessToken, providedRefreshToken, Constant.TOKEN_TYPE_BEARER);
        return ApiRes.ok("Token refreshed successfully", authRes);
    }

    public User getCurrentUserFallback(Throwable t) {
        throw new UnauthenticatedException(
                "User service is currently unavailable. Please try again later.", t);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "'profile:' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "getProfileFallback")
    public ApiRes getProfile() {
        User user = getCurrentUser();

        SettingEntity setting =
                settingRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ValidationException("User settings not found"));

        SettingsRes settingsRes =
                new SettingsRes(
                        setting.getTheme().name(),
                        setting.getLanguage().getCode(),
                        setting.getSpaceConfig());

        UserProfileRes profileRes =
                new UserProfileRes(
                        user.getDisplayName(), user.getBio(), user.getAge(), settingsRes);

        return ApiRes.ok("Profile retrieved successfully", profileRes);
    }

    // Fallback method for getProfile Circuit Breaker
    public ApiRes getProfileFallback(Throwable t) {
        throw new ValidationException(
                "Profile service is currently unavailable. Please try again later.");
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", key = "'profile:' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "updateProfileFallback")
    public ApiRes updateProfile(UpdateProfileReq request) {
        User user = getCurrentUser();

        // Update user profile fields
        user.setDisplayName(request.displayName());
        user.setBio(request.bio());
        user.setAge(request.age());
        userRepository.save(user);

        // Create default setting if not exists
        SettingEntity setting = settingRepository.findByUserId(user.getId()).orElse(null);
        if (setting == null) {
            Map<String, Integer> defaultSpaceConfig = new HashMap<>();
            defaultSpaceConfig.put("AGAIN", 1);
            defaultSpaceConfig.put("HARD", 1);
            defaultSpaceConfig.put("GOOD", 5);
            defaultSpaceConfig.put("EASY", 10);

            setting =
                    SettingEntity.builder()
                            .theme(Theme.SYSTEM)
                            .language(Language.ENGLISH)
                            .spaceConfig(defaultSpaceConfig)
                            .user(user)
                            .build();
            settingRepository.save(setting);
        }

        return getProfile();
    }

    // Fallback method for updateProfile Circuit Breaker
    public ApiRes updateProfileFallback(UpdateProfileReq request, Throwable t) {
        throw new ValidationException(
                "Profile update service is currently unavailable. Please try again later.");
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", key = "'profile:' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "updateSettingsFallback")
    public ApiRes updateSettings(UpdateSettingsReq request) {
        User user = getCurrentUser();

        SettingEntity setting = settingRepository.findByUserId(user.getId()).orElse(null);

        // Validate theme and language
        Theme theme;
        Language language;
        try {
            theme = Theme.fromString(request.theme());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid theme: " + request.theme());
        }

        try {
            language = Language.fromString(request.language());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid language: " + request.language());
        }

        // Convert SpaceConfigReq to Map
        Map<String, Integer> spaceConfigMap = new HashMap<>();
        spaceConfigMap.put("AGAIN", request.spaceConfig().AGAIN());
        spaceConfigMap.put("HARD", request.spaceConfig().HARD());
        spaceConfigMap.put("GOOD", request.spaceConfig().GOOD());
        spaceConfigMap.put("EASY", request.spaceConfig().EASY());

        if (setting == null) {
            // Create new setting
            setting =
                    SettingEntity.builder()
                            .theme(theme)
                            .language(language)
                            .spaceConfig(spaceConfigMap)
                            .user(user)
                            .build();
        } else {
            // Update existing
            setting.setTheme(theme);
            setting.setLanguage(language);
            setting.setSpaceConfig(spaceConfigMap);
        }

        settingRepository.save(setting);
        return getProfile();
    }

    // Fallback method for updateSettings Circuit Breaker
    public ApiRes updateSettingsFallback(UpdateSettingsReq request, Throwable t) {
        throw new ValidationException(
                "Settings update service is currently unavailable. Please try again later.");
    }

    public ApiRes refreshTokenFallback(RefreshTokenReq refreshTokenReq, Throwable t) {
        log.error(
                "Refresh token service unavailable for user {}",
                StringUtils.masked(refreshTokenReq.userEmail()));
        throw new RetryLaterException(
                "Refresh token service is currently unavailable. Please try again later.", t);
    }

    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "logoutFallback")
    @Override
    public ApiRes logout() {
        String userId = getCurrentUserId();
        log.info("Processing logout request for user ID: {}", userId);

        String refreshTokenKey = Constant.REFRESH_TOKEN_REDIS_KEY + userId;
        Boolean deleted = stringRedisTemplate.delete(refreshTokenKey);

        SecurityContextHolder.clearContext();

        log.info("Cleared security context for user ID: {} success {}", userId, deleted);

        return ApiRes.ok("Logged out successfully");
    }

    @Override
    public ApiRes validateToken() {
        getCurrentUser();
        return ApiRes.success("Token is valid", Map.of("valid", true));
    }

    public ApiRes logoutFallback(Throwable t) {
        log.error("Logout service unavailable");
        throw new RetryLaterException(
                "Logout service is currently unavailable. Please try again later.", t);
    }
}
