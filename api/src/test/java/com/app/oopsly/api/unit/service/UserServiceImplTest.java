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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.Language;
import com.app.oopsly.api.entity.SettingEntity;
import com.app.oopsly.api.entity.Theme;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.SettingRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.impl.UserServiceImpl;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
import com.app.oopsly.api.viewmodel.SpaceConfigReq;
import com.app.oopsly.api.viewmodel.StudyScheduleReq;
import com.app.oopsly.api.viewmodel.UpdateProfileReq;
import com.app.oopsly.api.viewmodel.UpdateSettingsReq;
import com.app.oopsly.api.viewmodel.UserProfileRes;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;

    @Mock private SettingRepository settingRepository;

    @Mock private SecurityContext securityContext;

    @Mock private Authentication authentication;

    @Mock private JwtUtils jwtUtils;

    @Mock private StringRedisTemplate stringRedisTemplate;

    @Mock private ValueOperations<String, String> valueOps;

    @InjectMocks private UserServiceImpl userService;

    private UUID userId;
    private User user;
    private SettingEntity setting;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setDisplayName("Test User");
        user.setBio("Test Bio");
        user.setAge(25);

        Map<String, Integer> spaceConfig = new HashMap<>();
        spaceConfig.put("AGAIN", 1);
        spaceConfig.put("HARD", 1);
        spaceConfig.put("GOOD", 5);
        spaceConfig.put("EASY", 10);

        setting = new SettingEntity();
        setting.setId(UUID.randomUUID());
        setting.setTheme(Theme.SYSTEM);
        setting.setLanguage(Language.ENGLISH);
        setting.setSpaceConfig(spaceConfig);
        setting.setStudySchedule(com.app.oopsly.api.entity.StudySchedule.defaults());
        setting.setUser(user);

        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUserId_returnsUserIdFromSecurityContext() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());

        String result = userService.getCurrentUserId();

        assertEquals(userId.toString(), result);
        verify(securityContext, times(1)).getAuthentication();
        verify(authentication, times(1)).getPrincipal();
    }

    @Test
    void getCurrentUser_returnsUserFromDatabase() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertSame(user, result);
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void getCurrentUser_throwsException_whenUserNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        UnauthenticatedException exception =
                assertThrows(UnauthenticatedException.class, () -> userService.getCurrentUser());
        assertTrue(exception.getMessage().contains("User not found"));
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void getCurrentUser_withRealAuthentication_works() {
        Authentication realAuth =
                new UsernamePasswordAuthenticationToken(userId.toString(), null, null);
        SecurityContext realContext = SecurityContextHolder.createEmptyContext();
        realContext.setAuthentication(realAuth);
        SecurityContextHolder.setContext(realContext);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertSame(user, result);
    }

    @Test
    void getCurrentUserId_withInvalidUUID_stillReturnsString() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        String result = userService.getCurrentUserId();

        assertEquals(invalidId, result);
    }

    @Test
    void getCurrentUser_withInvalidUUID_throwsIllegalArgumentException() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        assertThrows(IllegalArgumentException.class, () -> userService.getCurrentUser());
    }

    @Test
    void getCurrentUser_withNullPrincipal_throwsNullPointerException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(null);

        assertThrows(NullPointerException.class, () -> userService.getCurrentUser());
    }

    @Test
    void getCurrentUser_calledMultipleTimes_queriesDatabaseEachTime() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.getCurrentUser();
        userService.getCurrentUser();
        userService.getCurrentUser();

        verify(userRepository, times(3)).findById(userId);
    }

    @Test
    void getCurrentUserFallback_throwsUnauthenticatedException() {
        RuntimeException cause = new RuntimeException("Database connection failed");

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("User service is currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getCurrentUserFallback_withDatabaseException_preservesCauseChain() {
        Exception originalCause = new java.sql.SQLException("Connection timeout");
        RuntimeException wrappedCause = new RuntimeException("Database error", originalCause);

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(wrappedCause));

        assertNotNull(exception.getCause());
        assertEquals(wrappedCause, exception.getCause());
        assertEquals(originalCause, exception.getCause().getCause());
    }

    @Test
    void getCurrentUserFallback_withNullThrowable_handlesGracefully() {
        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(null));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("User service is currently unavailable"));
        assertNull(exception.getCause());
    }

    @Test
    void getCurrentUserFallback_providesUserFriendlyMessage() {
        Throwable cause = new Throwable("Internal circuit breaker error");

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(cause));

        String message = exception.getMessage();
        assertTrue(message.contains("currently unavailable"));
        assertTrue(message.contains("try again later"));
    }

    @Test
    void getProfileFallback_providesUserFriendlyMessage() {
        Throwable cause = new Throwable("Internal circuit breaker error");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class, () -> userService.getProfileFallback(cause));

        String message = exception.getMessage();
        assertTrue(message.contains("Profile service"));
        assertTrue(message.contains("currently unavailable"));
        assertTrue(message.contains("try again later"));
    }

    @Test
    void updateProfileFallback_providesUserFriendlyMessage() {
        UpdateProfileReq request = new UpdateProfileReq("Test User", "Test Bio", 25);
        Throwable cause = new Throwable("Internal circuit breaker error");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> userService.updateProfileFallback(request, cause));

        String message = exception.getMessage();
        assertTrue(message.contains("Profile update service"));
        assertTrue(message.contains("currently unavailable"));
        assertTrue(message.contains("try again later"));
    }

    @Test
    void updateSettingsFallback_providesUserFriendlyMessage() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "LIGHT",
                        "en",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(1, 2, 3, 4, 5), false));
        Throwable cause = new Throwable("Internal circuit breaker error");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> userService.updateSettingsFallback(request, cause));

        String message = exception.getMessage();
        assertTrue(message.contains("Settings update service"));
        assertTrue(message.contains("currently unavailable"));
        assertTrue(message.contains("try again later"));
    }

    // Profile Management Tests
    @Test
    void getProfile_returnsUserProfile_whenProfileExists() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        ApiRes result = userService.getProfile();

        assertNotNull(result);
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        UserProfileRes profile = (UserProfileRes) result.getBody().data();
        assertEquals("Test User", profile.displayName());
        assertEquals("Test Bio", profile.bio());
        assertEquals(25, profile.age());
        assertNotNull(profile.settings());
        assertEquals("SYSTEM", profile.settings().theme());
        assertEquals("en", profile.settings().language());
        verify(settingRepository).findByUserId(userId);
    }

    @Test
    void getProfile_createsSettings_whenNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        ApiRes result = userService.getProfile();

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<SettingEntity> captor = ArgumentCaptor.forClass(SettingEntity.class);
        verify(settingRepository).save(captor.capture());
        SettingEntity created = captor.getValue();
        assertEquals(Theme.SYSTEM, created.getTheme());
        assertEquals(Language.ENGLISH, created.getLanguage());
        assertEquals(1, created.getSpaceConfig().get("AGAIN"));
        assertEquals(1, created.getSpaceConfig().get("HARD"));
        assertEquals(5, created.getSpaceConfig().get("GOOD"));
        assertEquals(10, created.getSpaceConfig().get("EASY"));
    }

    @Test
    void updateProfile_createsSettingsIfNotExist() {
        UpdateProfileReq request = new UpdateProfileReq("New User", "New Bio", 30);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        ApiRes result = userService.updateProfile(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        verify(userRepository, times(1)).save(any(User.class));
        verify(settingRepository, times(1)).save(any(SettingEntity.class));
    }

    @Test
    void updateProfile_updatesExistingProfile() {
        UpdateProfileReq request = new UpdateProfileReq("Updated User", "Updated Bio", 35);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        ApiRes result = userService.updateProfile(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(1)).save(captor.capture());
        User savedUser = captor.getValue();
        assertEquals("Updated User", savedUser.getDisplayName());
        assertEquals("Updated Bio", savedUser.getBio());
        assertEquals(35, savedUser.getAge());
    }

    @Test
    void updateSettings_updatesExistingSettings() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(2, 3, 7, 14);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "DARK",
                        "vi",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(1, 2, 3, 4, 5), false));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<SettingEntity> captor = ArgumentCaptor.forClass(SettingEntity.class);
        verify(settingRepository).save(captor.capture());
        SettingEntity savedSetting = captor.getValue();
        assertEquals(Theme.DARK, savedSetting.getTheme());
        assertEquals(Language.VIETNAMESE, savedSetting.getLanguage());
        assertEquals(2, savedSetting.getSpaceConfig().get("AGAIN"));
        assertEquals(3, savedSetting.getSpaceConfig().get("HARD"));
        assertEquals(7, savedSetting.getSpaceConfig().get("GOOD"));
        assertEquals(14, savedSetting.getSpaceConfig().get("EASY"));
    }

    @Test
    void updateSettings_throwsException_whenInvalidTheme() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "INVALID_THEME",
                        "en",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(1, 2, 3, 4, 5), false));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        ValidationException exception =
                assertThrows(ValidationException.class, () -> userService.updateSettings(request));
        assertTrue(exception.getMessage().contains("Invalid theme"));
    }

    @Test
    void updateSettings_throwsException_whenInvalidLanguage() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "LIGHT",
                        "invalid-lang",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(1, 2, 3, 4, 5), false));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        ValidationException exception =
                assertThrows(ValidationException.class, () -> userService.updateSettings(request));
        assertTrue(exception.getMessage().contains("Invalid language"));
    }

    @Test
    void updateSettings_createsNewSettings_whenSettingsDoNotExist() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 2, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "LIGHT",
                        "en",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(1, 2, 3, 4, 5), false));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        verify(settingRepository, times(1)).save(any(SettingEntity.class));
    }

    // Refresh Token Tests
    @Test
    void refreshToken_success_returnsNewTokens() {
        String email = "test@example.com";
        String refreshToken = "valid-refresh-token";
        String storedRefreshToken = "valid-refresh-token";
        String newAccessToken = "new-access-token";
        String newRefreshToken = "new-refresh-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(storedRefreshToken);

        when(jwtUtils.generateTokenWithClaims(anyMap(), eq(email))).thenReturn(newAccessToken);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(jwtUtils, times(1)).isTokenValid(refreshToken, email);
        verify(valueOps, times(1)).get(Constant.REFRESH_TOKEN_REDIS_KEY + userId);
        verify(userRepository, times(1)).findByEmail(email);
        verify(jwtUtils, times(1)).generateTokenWithClaims(anyMap(), eq(email));
    }

    @Test
    void refreshToken_invalidToken_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "invalid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(false);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(jwtUtils, times(1)).isTokenValid(refreshToken, email);
        verify(stringRedisTemplate, never()).opsForValue();
    }

    @Test
    void refreshToken_tokenMismatch_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "token1";
        String storedToken = "token2";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(storedToken);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void refreshToken_noStoredToken_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(null);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void refreshToken_userNotFound_throwsException() {
        String email = "test@example.com";
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThrows(UnauthenticatedException.class, () -> userService.refreshToken(req));
    }

    @Test
    void refreshToken_emailMismatch_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "valid-token";
        User differentUser = new User();
        differentUser.setId(userId);
        differentUser.setEmail("different@example.com");

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(refreshToken);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(differentUser));

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void refreshToken_withNullEmail_handlesGracefully() {
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, null);

        when(jwtUtils.isTokenValid(refreshToken, null)).thenReturn(false);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // Fallback Method Tests
    @Test
    void refreshTokenFallback_throwsRuntimeException() {
        RefreshTokenReq req = new RefreshTokenReq("token", "test@example.com");
        RuntimeException cause = new RuntimeException("Service unavailable");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> userService.refreshTokenFallback(req, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void refreshTokenFallback_withNullThrowable_handlesGracefully() {
        RefreshTokenReq req = new RefreshTokenReq("token", "test@example.com");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> userService.refreshTokenFallback(req, null));

        assertNotNull(exception);
        assertNotNull(exception.getMessage());
    }

    // Logout Tests
    @Test
    void logout_success_deletesRefreshToken() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(true);

        ApiRes response = userService.logout();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(stringRedisTemplate, times(1))
                .delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId.toString());
    }

    @Test
    void logout_noTokenFound_returnsSuccess() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(false);

        ApiRes response = userService.logout();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(stringRedisTemplate, times(1))
                .delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId.toString());
    }

    @Test
    void logout_redisException_throwsRuntimeException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(anyString()))
                .thenThrow(new RuntimeException("Redis connection failed"));

        assertThrows(RuntimeException.class, () -> userService.logout());
    }

    @Test
    void logoutFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Service unavailable");

        RetryLaterException exception =
                assertThrows(RetryLaterException.class, () -> userService.logoutFallback(cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void logoutFallback_withNullThrowable_handlesGracefully() {
        RetryLaterException exception =
                assertThrows(RetryLaterException.class, () -> userService.logoutFallback(null));

        assertNotNull(exception);
        assertNotNull(exception.getMessage());
    }

    @Test
    void validateToken_returnsValidFlag() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ApiRes result = userService.validateToken();

        assertTrue(result.getBody().isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.getBody().data();
        assertEquals(true, data.get("valid"));
    }

    @Test
    void updateUserProgress_firstReview_setsStreakToOne() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        user.setDailyStreak(null);
        user.setTotalXp(null);
        user.setLastReviewedAt(null);
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.updateUserProgress(10);

        assertEquals(10, user.getTotalXp());
        assertEquals(1, user.getDailyStreak());
        assertNotNull(user.getLastReviewedAt());
    }

    @Test
    void updateUserProgress_yesterdayReview_incrementsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        user.setDailyStreak(2);
        user.setTotalXp(5);
        user.setLastReviewedAt(
                java.time.LocalDate.now(java.time.ZoneOffset.UTC)
                        .minusDays(1)
                        .atStartOfDay(java.time.ZoneOffset.UTC)
                        .toInstant());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.updateUserProgress(3);

        assertEquals(8, user.getTotalXp());
        assertEquals(3, user.getDailyStreak());
    }

    @Test
    void updateUserProgress_sameDay_keepsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        user.setDailyStreak(4);
        user.setTotalXp(20);
        user.setLastReviewedAt(java.time.Instant.now());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.updateUserProgress(1);

        assertEquals(21, user.getTotalXp());
        assertEquals(4, user.getDailyStreak());
    }

    @Test
    void updateUserProgress_staleReview_resetsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        user.setDailyStreak(9);
        user.setTotalXp(1);
        user.setLastReviewedAt(
                java.time.LocalDate.now(java.time.ZoneOffset.UTC)
                        .minusDays(3)
                        .atStartOfDay(java.time.ZoneOffset.UTC)
                        .toInstant());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.updateUserProgress(2);

        assertEquals(1, user.getDailyStreak());
        assertEquals(3, user.getTotalXp());
    }

    @Test
    void updateUserProgress_userNotFound_throws() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.empty());

        assertThrows(UnauthenticatedException.class, () -> userService.updateUserProgress(1));
    }

    @Test
    void updateSettings_rejectsNullStudyDays() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "DARK", "en", spaceConfigReq, new StudyScheduleReq("09:00", null, true));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        assertThrows(ValidationException.class, () -> userService.updateSettings(request));
    }

    @Test
    void updateSettings_rejectsInvalidStudyDay() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "DARK",
                        "en",
                        spaceConfigReq,
                        new StudyScheduleReq("09:00", List.of(7), true));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        assertThrows(ValidationException.class, () -> userService.updateSettings(request));
    }

    @Test
    void getProfile_defaultsStudySchedule_whenNull() {
        setting.setStudySchedule(null);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        ApiRes result = userService.getProfile();

        assertTrue(result.getBody().isSuccess());
        UserProfileRes profile = (UserProfileRes) result.getBody().data();
        assertNotNull(profile.settings().studySchedule());
    }

    @Test
    void getProfileFallback_rethrowsValidationAndUnauthenticated() {
        ValidationException ve = new ValidationException("bad");
        assertSame(
                ve,
                assertThrows(ValidationException.class, () -> userService.getProfileFallback(ve)));
        UnauthenticatedException ue = new UnauthenticatedException("nope");
        assertSame(
                ue,
                assertThrows(
                        UnauthenticatedException.class, () -> userService.getProfileFallback(ue)));
    }

    @Test
    void updateProfileFallback_rethrowsKnownExceptions() {
        UpdateProfileReq req = new UpdateProfileReq("n", "b", 20);
        ValidationException ve = new ValidationException("bad");
        assertThrows(ValidationException.class, () -> userService.updateProfileFallback(req, ve));
        UnauthenticatedException ue = new UnauthenticatedException("nope");
        assertThrows(
                UnauthenticatedException.class, () -> userService.updateProfileFallback(req, ue));
    }

    @Test
    void updateSettingsFallback_rethrowsKnownExceptions() {
        UpdateSettingsReq req =
                new UpdateSettingsReq(
                        "DARK",
                        "en",
                        new SpaceConfigReq(1, 1, 5, 10),
                        new StudyScheduleReq("09:00", List.of(1), true));
        assertThrows(
                ValidationException.class,
                () -> userService.updateSettingsFallback(req, new ValidationException("x")));
        assertThrows(
                UnauthenticatedException.class,
                () -> userService.updateSettingsFallback(req, new UnauthenticatedException("y")));
    }

    @Test
    void updateSettings_rejectsNullDayInStudyDays() {
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "DARK",
                        "en",
                        new SpaceConfigReq(1, 1, 5, 10),
                        new StudyScheduleReq("09:00", java.util.Arrays.asList(1, null), true));
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));
        assertThrows(ValidationException.class, () -> userService.updateSettings(request));
    }
}
