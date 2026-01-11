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

import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.UpdateProfileRequest;
import com.app.oopsly.api.viewmodel.UpdateSettingsRequest;
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

    private UserProfileRes mockProfile;

    @BeforeEach
    void setUp() {
        Map<String, Integer> spaceConfig = new HashMap<>();
        spaceConfig.put("AGAIN", 1);
        spaceConfig.put("HARD", 1);
        spaceConfig.put("GOOD", 5);
        spaceConfig.put("EASY", 10);

        UserProfileRes.SettingsRes settings =
                new UserProfileRes.SettingsRes("SYSTEM", "en-US", spaceConfig);
        mockProfile = new UserProfileRes("Test User", "Test Bio", 25, settings);
    }

    @Test
    void getProfile_returnsProfile_whenSuccessful() {
        when(userService.getProfile()).thenReturn(mockProfile);

        ApiRes result = userProfileController.getProfile();

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).getProfile();
    }

    @Test
    void updateProfile_updatesProfile_withValidData() {
        UpdateProfileRequest request = new UpdateProfileRequest("Updated User", "Updated Bio", 30);

        when(userService.updateProfile(any(UpdateProfileRequest.class))).thenReturn(mockProfile);

        ApiRes result = userProfileController.updateProfile(request);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).updateProfile(request);
    }

    @Test
    void updateSettings_updatesSettings_withValidData() {
        UpdateSettingsRequest request =
                new UpdateSettingsRequest(
                        "DARK", "vi-VN", new com.app.oopsly.api.viewmodel.SpaceConfigRequest(2, 3, 7, 14));

        when(userService.updateSettings(any(UpdateSettingsRequest.class))).thenReturn(mockProfile);

        ApiRes result = userProfileController.updateSettings(request);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        verify(userService, times(1)).updateSettings(request);
    }
}
