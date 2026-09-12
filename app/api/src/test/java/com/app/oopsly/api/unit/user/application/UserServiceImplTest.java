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

package com.app.oopsly.api.unit.user.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.shelf.vm.StudyScheduleReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.Constant;
import com.app.oopsly.api.shared.util.JwtUtils;
import com.app.oopsly.api.user.UserServiceImpl;
import com.app.oopsly.api.user.vm.RefreshTokenReq;
import com.app.oopsly.api.user.vm.SpaceConfigReq;
import com.app.oopsly.api.user.vm.UpdateProfileReq;
import com.app.oopsly.api.user.vm.UpdateSettingsReq;
import com.app.oopsly.api.user.vm.UserProfileRes;
import com.app.oopsly.api.user.Language;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.Theme;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.SettingRepository;
import com.app.oopsly.api.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.fge.jsonpatch.JsonPatch;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Path;
import jakarta.validation.Validator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

    @Mock private ObjectMapper objectMapper;

    @Mock private Validator validator;

    private JsonNode mockJsonNode;

    @InjectMocks private UserServiceImpl userService;

    private UUID userId;
    private User user;
    private Setting setting;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setDisplayName("Test User");
        user.setBio("Test Bio");
        user.setAge(25);

        setting = new Setting();
        setting.setId(UUID.randomUUID());
        setting.setTheme(Theme.SYSTEM);
        setting.setLanguage(Language.ENGLISH);
        setting.setUser(user);

        mockJsonNode = mock(JsonNode.class);
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @DisplayName(
            "getCurrentUserId should return user ID from SecurityContext when user is"
                    + " authenticated")
    @Test
    void getCurrentUserId_shouldReturnUserIdFromSecurityContext_whenUserIsAuthenticated() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());

        String result = userService.getCurrentUserId();

        assertEquals(userId.toString(), result);
        verify(securityContext, times(1)).getAuthentication();
        verify(authentication, times(1)).getPrincipal();
    }

    @Test
    @DisplayName("getCurrentUser should return user from database when user exists")
    void getCurrentUser_shouldReturnUserFromDatabase_whenUserExists() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertSame(user, result);
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    @DisplayName("getCurrentUser should throw NotFoundException when user is not found")
    void getCurrentUser_shouldThrowNotFoundException_whenUserNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        NotFoundException exception =
                assertThrows(NotFoundException.class, () -> userService.getCurrentUser());
        assertTrue(exception.getMessage().contains("User not found"));
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    @DisplayName("getCurrentUser should return user from database when using real Authentication")
    void getCurrentUser_withRealAuthentication_shouldReturnUserFromDatabase() {
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
    @DisplayName(
            "getCurrentUserId should return user ID from SecurityContext when user ID is invalid"
                    + " UUID")
    void getCurrentUserId_withInvalidUUID_shouldReturnUserIdFromSecurityContext() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        String result = userService.getCurrentUserId();

        assertEquals(invalidId, result);
    }

    @Test
    @DisplayName(
            "getCurrentUser should throw IllegalArgumentException when user ID is invalid UUID")
    void getCurrentUser_withInvalidUUID_throwsIllegalArgumentException() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        assertThrows(IllegalArgumentException.class, () -> userService.getCurrentUser());
    }

    @Test
    @DisplayName("getCurrentUser should throw NullPointerException when principal is null")
    void getCurrentUser_withNullPrincipal_throwsNullPointerException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(null);

        assertThrows(NullPointerException.class, () -> userService.getCurrentUser());
    }

    @Test
    @DisplayName("getCurrentUser should query the database each time it is called")
    void getCurrentUser_calledMultipleTimes_shouldQueryDatabaseEachTime() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.getCurrentUser();
        userService.getCurrentUser();
        userService.getCurrentUser();

        verify(userRepository, times(3)).findById(userId);
    }

    @Test
    @DisplayName("getCurrentUserFallback should throw UnauthenticatedException")
    void getCurrentUserFallback_shouldThrowUnauthenticatedException() {
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
    @DisplayName(
            "getCurrentUserFallback should preserve the cause chain when a database exception"
                    + " occurs")
    void getCurrentUserFallback_withDatabaseException_shouldPreserveCauseChain() {
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
    @DisplayName("getCurrentUserFallback should handle null throwable gracefully")
    void getCurrentUserFallback_withNullThrowable_shouldHandleGracefully() {
        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(null));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("User service is currently unavailable"));
        assertNull(exception.getCause());
    }

    @Test
    @DisplayName("getCurrentUserFallback should provide a user-friendly message")
    void getCurrentUserFallback_shouldProvideUserFriendlyMessage() {
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
    @DisplayName("getProfileFallback should provide a user-friendly message")
    void getProfileFallback_shouldProvideUserFriendlyMessage() {
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
    @DisplayName("updateProfileFallback should provide a user-friendly message")
    void updateProfileFallback_shouldProvideUserFriendlyMessage() {
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
    @DisplayName("updateSettingsFallback should provide a user-friendly message")
    void updateSettingsFallback_shouldProvideUserFriendlyMessage() {
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
    @DisplayName("getProfile should return user profile when profile exists")
    void getProfile_returnsUserProfile_whenProfileExists() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));

        ApiRes result = userService.getProfile();

        assertNotNull(result);
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        UserProfileRes profile = (UserProfileRes) result.getBody().data();
        assertEquals("Test User", profile.displayName());
        assertEquals("Test Bio", profile.bio());
        assertNotNull(profile.settings());
        assertEquals("SYSTEM", profile.settings().theme());
        assertEquals("en", profile.settings().language());
        verify(settingRepository).findByUser(user);
    }

    @Test
    @DisplayName("getProfile should create settings when not found")
    void getProfile_createsSettings_whenNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.empty());
        when(settingRepository.saveAndFlush(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.getProfile();

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<Setting> captor = ArgumentCaptor.forClass(Setting.class);
        verify(settingRepository).saveAndFlush(captor.capture());
        Setting created = captor.getValue();
        assertEquals(Theme.SYSTEM, created.getTheme());
        assertEquals(Language.ENGLISH, created.getLanguage());
    }

    @Test
    @DisplayName("updateProfile should create settings if not exist")
    void updateProfile_createsSettingsIfNotExist() {
        UpdateProfileReq request = new UpdateProfileReq("New User", "New Bio", 30);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.saveAndFlush(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateProfile(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        verify(userRepository, times(1)).save(any(User.class));
        verify(settingRepository, times(1)).saveAndFlush(any(Setting.class));
    }

    @Test
    @DisplayName("updateProfile should update existing profile")
    void updateProfile_updatesExistingProfile() {
        UpdateProfileReq request = new UpdateProfileReq("Updated User", "Updated Bio", 35);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));

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
    @DisplayName("updateSettings should update existing settings")
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
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<Setting> captor = ArgumentCaptor.forClass(Setting.class);
        verify(settingRepository).save(captor.capture());
        Setting savedSetting = captor.getValue();
        assertEquals(Theme.DARK, savedSetting.getTheme());
        assertEquals(Language.VIETNAMESE, savedSetting.getLanguage());
    }

    @Test
    @DisplayName("updateSettings should throw ValidationException when theme is invalid")
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
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));

        ValidationException exception =
                assertThrows(ValidationException.class, () -> userService.updateSettings(request));
        assertTrue(exception.getMessage().contains("Invalid theme"));
    }

    @Test
    @DisplayName("updateSettings should throw ValidationException when language is invalid")
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
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));

        ValidationException exception =
                assertThrows(ValidationException.class, () -> userService.updateSettings(request));
        assertTrue(exception.getMessage().contains("Invalid language"));
    }

    @Test
    @DisplayName("updateSettings should create new settings when settings do not exist")
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
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        verify(settingRepository, times(1)).save(any(Setting.class));
    }

    @Test
    @DisplayName("patchUserProfileUpdates should return OK when patch is valid")
    void patchUserProfileUpdates_returnsOk_whenPatchIsValid() throws Exception {
        JsonPatch jsonPatch = mock(JsonPatch.class);
        User patchedUser = new User();
        patchedUser.setId(userId);
        patchedUser.setEmail("patched@example.com");
        patchedUser.setDisplayName("Patched User");
        patchedUser.setBio("Patched Bio");
        patchedUser.setAge(31);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(objectMapper.convertValue(user, JsonNode.class)).thenReturn(mockJsonNode);
        when(jsonPatch.apply(any(JsonNode.class))).thenReturn(mockJsonNode);
        when(objectMapper.treeToValue(any(JsonNode.class), eq(User.class))).thenReturn(patchedUser);
        when(validator.validate(patchedUser)).thenReturn(Set.of());
        when(userRepository.save(patchedUser)).thenReturn(patchedUser);

        ApiRes result = userService.patchUserProfileUpdates(jsonPatch);

        assertNotNull(result);
        assertTrue(result.getBody().isSuccess());
        assertEquals("User profile updated successfully", result.getBody().message());
        assertSame(patchedUser, result.getBody().data());
        verify(userRepository).save(patchedUser);
    }

    @Test
    @DisplayName("patchUserProfileUpdates should return BadRequest when patch fails")
    void patchUserProfileUpdates_returnsBadRequest_whenPatchFails() throws Exception {
        JsonPatch jsonPatch = mock(JsonPatch.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(objectMapper.convertValue(user, JsonNode.class)).thenReturn(mockJsonNode);
        when(jsonPatch.apply(any(JsonNode.class)))
                .thenThrow(new com.github.fge.jsonpatch.JsonPatchException("bad patch"));

        ApiRes result = userService.patchUserProfileUpdates(jsonPatch);

        assertNotNull(result);
        assertFalse(result.getBody().isSuccess());
        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        assertEquals("Failed to apply JSON patch", result.getBody().message());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName(
            "patchUserProfileUpdates should propagate ValidationException when updated user is"
                    + " invalid")
    void patchUserProfileUpdates_propagatesValidationException_whenUpdatedUserIsInvalid()
            throws Exception {
        JsonPatch jsonPatch = mock(JsonPatch.class);
        User patchedUser = new User();
        patchedUser.setId(userId);

        ConstraintViolation<User> violation = mock(ConstraintViolation.class);
        Path mockPath = mock(Path.class);
        when(mockPath.toString()).thenReturn("displayName");
        when(violation.getPropertyPath()).thenReturn(mockPath);
        when(violation.getMessage()).thenReturn("must not be blank");

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(objectMapper.convertValue(user, JsonNode.class)).thenReturn(mockJsonNode);
        when(jsonPatch.apply(any(JsonNode.class))).thenReturn(mockJsonNode);
        when(objectMapper.treeToValue(any(JsonNode.class), eq(User.class))).thenReturn(patchedUser);
        when(validator.validate(patchedUser)).thenReturn(Set.of(violation));

        ValidationException exception =
                assertThrows(
                        ValidationException.class,
                        () -> userService.patchUserProfileUpdates(jsonPatch));

        assertTrue(exception.getMessage().contains("Validation failed"));
        assertTrue(exception.getMessage().contains("displayName"));
        assertTrue(exception.getMessage().contains("must not be blank"));
        verify(userRepository, never()).save(any());
    }

    // Refresh Token Tests
    @Test
    @DisplayName("refreshToken should return new tokens when refresh token is valid")
    void refreshToken_success_returnsNewTokens() {
        String email = "test@example.com";
        String refreshToken = "valid-refresh-token";
        String storedRefreshToken = "valid-refresh-token";
        String newAccessToken = "new-access-token";

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
    @DisplayName("refreshToken should return UNAUTHORIZED when refresh token is invalid")
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
    @DisplayName(
            "refreshToken should return UNAUTHORIZED when stored token does not match provided"
                    + " token")
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
    @DisplayName("refreshToken should return UNAUTHORIZED when no stored token is found")
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
    @DisplayName("refreshToken should throw UnauthenticatedException when user is not found")
    void refreshToken_userNotFound_throwsException() {
        String email = "test@example.com";
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThrows(UnauthenticatedException.class, () -> userService.refreshToken(req));
    }

    @Test
    @DisplayName("refreshToken should return UNAUTHORIZED when email is null")
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
    @DisplayName("validateToken should return valid flag when token is valid")
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
    @DisplayName("updateUserProgress should set streak to one on first review")
    void updateUserProgress_firstReview_setsStreakToOne() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        setting.setDailyStreak(null);
        setting.setTotalXp(null);
        setting.setLastReviewedAt(null);
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));
        when(settingRepository.save(setting)).thenReturn(setting);

        userService.updateUserProgress(10);

        assertEquals(10, setting.getTotalXp());
        assertEquals(1, setting.getDailyStreak());
        assertNotNull(setting.getLastReviewedAt());
    }

    @Test
    @DisplayName("updateUserProgress should increment streak when last review was yesterday")
    void updateUserProgress_yesterdayReview_incrementsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        setting.setDailyStreak(2);
        setting.setTotalXp(5);
        setting.setLastReviewedAt(
                java.time.LocalDate.now(java.time.ZoneOffset.UTC)
                        .minusDays(1)
                        .atStartOfDay(java.time.ZoneOffset.UTC)
                        .toInstant());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));
        when(settingRepository.save(setting)).thenReturn(setting);

        userService.updateUserProgress(3);

        assertEquals(8, setting.getTotalXp());
        assertEquals(3, setting.getDailyStreak());
    }

    @Test
    @DisplayName("updateUserProgress should keep streak when last review was today")
    void updateUserProgress_sameDay_keepsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        setting.setDailyStreak(4);
        setting.setTotalXp(20);
        setting.setLastReviewedAt(java.time.Instant.now());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));
        when(settingRepository.save(setting)).thenReturn(setting);

        userService.updateUserProgress(1);

        assertEquals(21, setting.getTotalXp());
        assertEquals(4, setting.getDailyStreak());
    }

    @Test
    @DisplayName(
            "updateUserProgress should reset streak when last review was more than one day ago")
    void updateUserProgress_staleReview_resetsStreak() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        setting.setDailyStreak(9);
        setting.setTotalXp(1);
        setting.setLastReviewedAt(
                java.time.LocalDate.now(java.time.ZoneOffset.UTC)
                        .minusDays(3)
                        .atStartOfDay(java.time.ZoneOffset.UTC)
                        .toInstant());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));
        when(settingRepository.save(setting)).thenReturn(setting);

        userService.updateUserProgress(2);

        assertEquals(1, setting.getDailyStreak());
        assertEquals(3, setting.getTotalXp());
    }

    @Test
    @DisplayName("updateUserProgress should throw UnauthenticatedException when user is not found")
    void updateUserProgress_userNotFound_throws() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findByIdWithLock(userId)).thenReturn(Optional.empty());

        assertThrows(UnauthenticatedException.class, () -> userService.updateUserProgress(1));
    }

    @Test
    @DisplayName("updateSettings should reject null study days")
    void updateSettings_rejectsNullStudyDays() {
        SpaceConfigReq spaceConfigReq = new SpaceConfigReq(1, 1, 5, 10);
        UpdateSettingsReq request =
                new UpdateSettingsReq(
                        "DARK", "en", spaceConfigReq, new StudyScheduleReq("09:00", null, true));

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertTrue(result.getBody().isSuccess());
    }

    @Test
    @DisplayName("updateSettings should ignore invalid study day because it is not persisted")
    void updateSettings_ignoresInvalidStudyDay() {
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
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertTrue(result.getBody().isSuccess());
    }

    @Test
    @DisplayName("getProfile should succeed when settings have no extra JSON fields")
    void getProfile_succeedsWithoutJsonSettings() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUser(user)).thenReturn(Optional.of(setting));

        ApiRes result = userService.getProfile();

        assertTrue(result.getBody().isSuccess());
    }

    @Test
    @DisplayName(
            "getProfileFallback should rethrow ValidationException and UnauthenticatedException")
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
    @DisplayName("updateProfileFallback should rethrow known exceptions")
    void updateProfileFallback_rethrowsKnownExceptions() {
        UpdateProfileReq req = new UpdateProfileReq("n", "b", 20);
        ValidationException ve = new ValidationException("bad");
        assertThrows(ValidationException.class, () -> userService.updateProfileFallback(req, ve));
        UnauthenticatedException ue = new UnauthenticatedException("nope");
        assertThrows(
                UnauthenticatedException.class, () -> userService.updateProfileFallback(req, ue));
    }

    @Test
    @DisplayName("updateSettingsFallback should rethrow known exceptions")
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
    @DisplayName("updateSettings should reject null day in study days")
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
        when(settingRepository.findByUser(user))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(Setting.class))).thenReturn(setting);

        ApiRes result = userService.updateSettings(request);

        assertTrue(result.getBody().isSuccess());
    }
}
