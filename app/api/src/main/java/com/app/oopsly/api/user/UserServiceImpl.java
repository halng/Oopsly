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

package com.app.oopsly.api.user;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.Constant;
import com.app.oopsly.api.shared.util.JwtUtils;
import com.app.oopsly.api.shared.util.StringUtils;
import com.app.oopsly.api.user.vm.AuthRes;
import com.app.oopsly.api.user.vm.RefreshTokenReq;
import com.app.oopsly.api.user.vm.SettingsRes;
import com.app.oopsly.api.user.vm.UpdateProfileReq;
import com.app.oopsly.api.user.vm.UpdateSettingsReq;
import com.app.oopsly.api.user.vm.UserProfileRes;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.fge.jsonpatch.JsonPatch;
import com.github.fge.jsonpatch.JsonPatchException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
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
    private final ObjectMapper objectMapper;
    private final Validator validator;

    @Override
    public String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
    }

    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "getCurrentUserFallback")
    @Override
    public User getCurrentUser() {
        String currentUserId = getCurrentUserId();
        return userRepository
                .findById(UUID.fromString(currentUserId))
                .orElseThrow(() -> new NotFoundException("User not found"));
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
        claims.put("id", user.getId().toString());
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
    @Transactional()
    //    @Cacheable(value = "users", key = "'profile:' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "getProfileFallback")
    public ApiRes getProfile() {
        User user = getCurrentUser();
        Setting setting = ensureSettings(user);
        SettingsRes settingsRes = toSettingsRes(setting);

        //        TODO: query user progress from database or service, for now using dummy values
        UserProfileRes profileRes =
                new UserProfileRes(
                        user.getName(),
                        user.getEmail(),
                        user.getDisplayName(),
                        user.getPictureUrl(),
                        user.getBio(),
                        settingsRes,
                        100,
                        5,
                        200,
                        50,
                        0.85,
                        "GOLD");

        return ApiRes.ok("Profile retrieved successfully", profileRes);
    }

    // Fallback method for getProfile Circuit Breaker
    public ApiRes getProfileFallback(Throwable t) {
        if (t instanceof ValidationException ve) {
            throw ve;
        }
        if (t instanceof UnauthenticatedException ue) {
            throw ue;
        }
        throw new RetryLaterException(
                "Profile service is currently unavailable. Please try again later.", t);
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
        Setting setting = settingRepository.findByUser(user).orElse(null);
        if (setting == null) {
            setting = createDefaultSettings(user);
        }

        return getProfile();
    }

    // Fallback method for updateProfile Circuit Breaker
    public ApiRes updateProfileFallback(UpdateProfileReq request, Throwable t) {
        if (t instanceof ValidationException ve) {
            throw ve;
        }
        if (t instanceof UnauthenticatedException ue) {
            throw ue;
        }
        throw new RetryLaterException(
                "Profile update service is currently unavailable. Please try again later.", t);
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", key = "'profile:' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "updateSettingsFallback")
    public ApiRes updateSettings(UpdateSettingsReq request) {
        User user = getCurrentUser();

        Setting setting = settingRepository.findByUser(user).orElse(null);

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

        if (setting == null) {
            setting = Setting.builder().theme(theme).language(language).user(user).build();
        } else {
            setting.setTheme(theme);
            setting.setLanguage(language);
        }

        settingRepository.save(setting);
        return getProfile();
    }

    @Override
    public ApiRes updateIsNewComerStatus() {
        log.info("Updating isNewComer status for user");
        User user = getCurrentUser();
        Setting setting =
                settingRepository
                        .findByUser(user)
                        .orElseThrow(
                                () ->
                                        new ValidationException(
                                                "Setting not found for user: " + user.getId()));
        setting.setIsNewComer(false);
        settingRepository.save(setting);
        log.info("Setting isNewComer status for user: {}", user.getId());
        return ApiRes.ok("Updated isNewComer status successfully");
    }

    // Fallback method for updateSettings Circuit Breaker
    public ApiRes updateSettingsFallback(UpdateSettingsReq request, Throwable t) {
        if (t instanceof ValidationException ve) {
            throw ve;
        }
        if (t instanceof UnauthenticatedException ue) {
            throw ue;
        }
        throw new RetryLaterException(
                "Settings update service is currently unavailable. Please try again later.", t);
    }

    public ApiRes refreshTokenFallback(RefreshTokenReq refreshTokenReq, Throwable t) {
        log.error(
                "Refresh token service unavailable for user {}",
                StringUtils.masked(refreshTokenReq.userEmail()));
        if (t instanceof UnauthenticatedException ue) {
            throw ue;
        }
        if (t instanceof ValidationException ve) {
            throw ve;
        }
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

    private Setting createDefaultSettings(User user) {
        Setting setting =
                Setting.builder().theme(Theme.SYSTEM).language(Language.ENGLISH).user(user).build();
        return settingRepository.saveAndFlush(setting);
    }

    private SettingsRes toSettingsRes(Setting setting) {
        return new SettingsRes(
                setting.getTheme().name(),
                setting.getLanguage().getCode(),
                setting.getDailyGoal(),
                true,
                true,
                true,
                0.95,
                0.95,
                true,
                setting.getIsNewComer());
    }

    @Override
    @Transactional
    public void updateUserProgress(int xpGained) {
        UUID userId = UUID.fromString(getCurrentUserId());
        User user =
                userRepository
                        .findByIdWithLock(userId)
                        .orElseThrow(() -> new UnauthenticatedException("User not found"));
        Setting setting = ensureSettings(user);
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        int currentStreak = setting.getDailyStreak() != null ? setting.getDailyStreak() : 0;
        int currentXp = setting.getTotalXp() != null ? setting.getTotalXp() : 0;

        if (setting.getLastReviewedAt() != null) {
            LocalDate lastReviewDate =
                    setting.getLastReviewedAt().atZone(ZoneOffset.UTC).toLocalDate();
            if (lastReviewDate.equals(today.minusDays(1))) {
                currentStreak += 1;
            } else if (!lastReviewDate.equals(today)) {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }

        setting.setTotalXp(currentXp + xpGained);
        setting.setDailyStreak(currentStreak);
        setting.setLastReviewedAt(now);
        settingRepository.save(setting);
        log.info("Updated user progress: xp={}, streak={}", currentXp + xpGained, currentStreak);
    }

    @Override
    public ApiRes patchUserProfileUpdates(JsonPatch jsonPatch) {
        User user = getCurrentUser();
        log.info("Applying JSON patch to user profile for user ID: {}", user.getId());
        try {
            JsonNode targetNode = objectMapper.convertValue(user, JsonNode.class);
            JsonNode patchedNode = jsonPatch.apply(targetNode);

            User updatedUser = objectMapper.treeToValue(patchedNode, User.class);

            validateUser(updatedUser);

            userRepository.save(updatedUser);
            return ApiRes.ok("User profile updated successfully", updatedUser);
        } catch (JsonPatchException | JsonProcessingException e) {
            log.error("Failed to apply JSON patch: {}", e.getMessage());
            return ApiRes.badRequest("Failed to apply JSON patch");
        }
    }

    private void validateUser(User user) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        if (!violations.isEmpty()) {
            StringBuilder errorMessage = new StringBuilder();
            for (ConstraintViolation<User> violation : violations) {
                errorMessage
                        .append(violation.getPropertyPath())
                        .append(": ")
                        .append(violation.getMessage())
                        .append("; ");
            }
            throw new ValidationException("Validation failed: " + errorMessage);
        }
    }

    private Setting ensureSettings(User user) {
        Optional<Setting> existingSetting = settingRepository.findByUser(user);
        if (existingSetting.isPresent()) {
            return existingSetting.get();
        }
        return createDefaultSettings(user);
    }
}
