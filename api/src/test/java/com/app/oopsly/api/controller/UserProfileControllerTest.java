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

package com.app.oopsly.api.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SettingsRes;
import com.app.oopsly.api.viewmodel.SpaceConfigReq;
import com.app.oopsly.api.viewmodel.UpdateProfileReq;
import com.app.oopsly.api.viewmodel.UpdateSettingsReq;
import com.app.oopsly.api.viewmodel.UserProfileRes;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class UserProfileControllerTest {

    @Mock private UserService userService;

    @InjectMocks private UserProfileController userProfileController;

    private ApiRes mockApiRes;

    @BeforeEach
    void setUp() {
        Map<String, Integer> spaceConfig = new HashMap<>();
        spaceConfig.put("AGAIN", 1);
        spaceConfig.put("HARD", 1);
        spaceConfig.put("GOOD", 5);
        spaceConfig.put("EASY", 10);

        SettingsRes settings = new SettingsRes("SYSTEM", "en", spaceConfig);
        UserProfileRes mockProfile = new UserProfileRes("Test User", "Test Bio", 25, settings);
        mockApiRes = ApiRes.ok("Profile retrieved successfully", mockProfile);
    }

    @Test
    void getProfile_returnsProfile_whenSuccessful() {
        when(userService.getProfile()).thenReturn(mockApiRes);

        ApiRes result = userProfileController.getProfile();

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).getProfile();
    }

    @Test
    void getProfile_returnProfileWithEmptySetting_whenSettingsNotFound() {
        UserProfileRes profileWithEmptySettings =
                new UserProfileRes("Test User", "Test Bio", 25, null);
        when(userService.getProfile())
                .thenReturn(ApiRes.ok("Profile retrieved successfully", profileWithEmptySettings));

        ApiRes result = userProfileController.getProfile();
        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        Object body = result.getBody().data();
        assertInstanceOf(UserProfileRes.class, body);
        UserProfileRes userProfileRes = (UserProfileRes) body;
        assertNull(userProfileRes.settings());
        verify(userService, times(1)).getProfile();
    }

    @Test
    void updateProfile_updatesProfile_withValidData() {
        UpdateProfileReq request = new UpdateProfileReq("Updated User", "Updated Bio", 30);

        when(userService.updateProfile(any(UpdateProfileReq.class))).thenReturn(mockApiRes);

        ApiRes result = userProfileController.updateProfile(request);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).updateProfile(request);
    }

    @Test
    void updateProfile_withNullAge_isAllowed() {
        UpdateProfileReq request = new UpdateProfileReq("User", "Bio", null);

        when(userService.updateProfile(any(UpdateProfileReq.class))).thenReturn(mockApiRes);

        ApiRes result = userProfileController.updateProfile(request);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userService, times(1)).updateProfile(request);
    }

    @Test
    void updateSettings_updatesSettings_withValidData() {
        UpdateSettingsReq request =
                new UpdateSettingsReq("DARK", "vi", new SpaceConfigReq(2, 3, 7, 14));

        when(userService.updateSettings(any(UpdateSettingsReq.class))).thenReturn(mockApiRes);

        ApiRes result = userProfileController.updateSettings(request);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).updateSettings(request);
    }

    @Test
    void updateSettings_throwsException_whenInvalidTheme() {
        UpdateSettingsReq request =
                new UpdateSettingsReq("INVALID", "en", new SpaceConfigReq(1, 1, 5, 10));

        when(userService.updateSettings(any(UpdateSettingsReq.class)))
                .thenThrow(new ValidationException("Invalid theme: INVALID"));

        assertThrows(
                ValidationException.class, () -> userProfileController.updateSettings(request));
        verify(userService, times(1)).updateSettings(request);
    }

    @Test
    void updateSettings_throwsException_whenInvalidLanguage() {
        UpdateSettingsReq request =
                new UpdateSettingsReq("LIGHT", "fr", new SpaceConfigReq(1, 1, 5, 10));

        when(userService.updateSettings(any(UpdateSettingsReq.class)))
                .thenThrow(new ValidationException("Invalid language: fr"));

        assertThrows(
                ValidationException.class, () -> userProfileController.updateSettings(request));
        verify(userService, times(1)).updateSettings(request);
    }

    @Test
    void updateSettings_withAllThemeOptions() {
        SpaceConfigReq spaceConfig = new SpaceConfigReq(1, 1, 5, 10);

        when(userService.updateSettings(any(UpdateSettingsReq.class))).thenReturn(mockApiRes);

        // Test LIGHT theme
        ApiRes result1 =
                userProfileController.updateSettings(
                        new UpdateSettingsReq("LIGHT", "en", spaceConfig));
        assertNotNull(result1);
        assertEquals(HttpStatus.OK, result1.getStatusCode());

        // Test DARK theme
        ApiRes result2 =
                userProfileController.updateSettings(
                        new UpdateSettingsReq("DARK", "en", spaceConfig));
        assertNotNull(result2);
        assertEquals(HttpStatus.OK, result2.getStatusCode());

        // Test SYSTEM theme
        ApiRes result3 =
                userProfileController.updateSettings(
                        new UpdateSettingsReq("SYSTEM", "en", spaceConfig));
        assertNotNull(result3);
        assertEquals(HttpStatus.OK, result3.getStatusCode());

        verify(userService, times(3)).updateSettings(any(UpdateSettingsReq.class));
    }
}
