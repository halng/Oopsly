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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.*;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.SettingRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.impl.UserServiceImpl;
import com.app.oopsly.api.viewmodel.SpaceConfigRequest;
import com.app.oopsly.api.viewmodel.UpdateProfileRequest;
import com.app.oopsly.api.viewmodel.UpdateSettingsRequest;
import com.app.oopsly.api.viewmodel.UserProfileRes;
import java.util.HashMap;
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
        // Setup real authentication
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

    // Fallback Function Tests
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

    // Profile Management Tests
    @Test
    void getProfile_returnsUserProfile_whenProfileExists() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        UserProfileRes result = userService.getProfile();

        assertNotNull(result);
        assertEquals("Test User", result.displayName());
        assertEquals("Test Bio", result.bio());
        assertEquals(25, result.age());
        assertNotNull(result.settings());
        assertEquals("SYSTEM", result.settings().theme());
        assertEquals("en", result.settings().language());
        verify(settingRepository).findByUserId(userId);
    }

    @Test
    void getProfile_throwsException_whenSettingsNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ValidationException exception =
                assertThrows(ValidationException.class, () -> userService.getProfile());
        assertTrue(exception.getMessage().contains("User settings not found"));
    }

    @Test
    void updateProfile_createsSettingsIfNotExist() {
        UpdateProfileRequest request = new UpdateProfileRequest("New User", "New Bio", 30);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        UserProfileRes result = userService.updateProfile(request);

        assertNotNull(result);
        verify(userRepository, times(1)).save(any(User.class));
        verify(settingRepository, times(1)).save(any(SettingEntity.class));
    }

    @Test
    void updateProfile_updatesExistingProfile() {
        UpdateProfileRequest request = new UpdateProfileRequest("Updated User", "Updated Bio", 35);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(settingRepository.findByUserId(userId)).thenReturn(Optional.of(setting));

        UserProfileRes result = userService.updateProfile(request);

        assertNotNull(result);
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(1)).save(captor.capture());
        User savedUser = captor.getValue();
        assertEquals("Updated User", savedUser.getDisplayName());
        assertEquals("Updated Bio", savedUser.getBio());
        assertEquals(35, savedUser.getAge());
    }

    @Test
    void updateSettings_updatesExistingSettings() {
        SpaceConfigRequest spaceConfigReq = new SpaceConfigRequest(2, 3, 7, 14);
        UpdateSettingsRequest request = new UpdateSettingsRequest("DARK", "vi", spaceConfigReq);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.of(setting))
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        UserProfileRes result = userService.updateSettings(request);

        assertNotNull(result);
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
        SpaceConfigRequest spaceConfigReq = new SpaceConfigRequest(1, 1, 5, 10);
        UpdateSettingsRequest request =
                new UpdateSettingsRequest("INVALID_THEME", "en", spaceConfigReq);

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
        SpaceConfigRequest spaceConfigReq = new SpaceConfigRequest(1, 1, 5, 10);
        UpdateSettingsRequest request =
                new UpdateSettingsRequest("LIGHT", "invalid-lang", spaceConfigReq);

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
        SpaceConfigRequest spaceConfigReq = new SpaceConfigRequest(1, 2, 5, 10);
        UpdateSettingsRequest request = new UpdateSettingsRequest("LIGHT", "en", spaceConfigReq);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(settingRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SettingEntity.class))).thenReturn(setting);

        UserProfileRes result = userService.updateSettings(request);

        assertNotNull(result);
        verify(settingRepository, times(1)).save(any(SettingEntity.class));
    }
}
