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

import com.app.oopsly.api.entity.*;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.SettingRepository;
import com.app.oopsly.api.repository.UserInfoRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.UpdateProfileRequest;
import com.app.oopsly.api.viewmodel.UpdateSettingsRequest;
import com.app.oopsly.api.viewmodel.UserProfileRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserInfoRepository userInfoRepository;
    private final SettingRepository settingRepository;

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

    // Fallback method for Circuit Breaker
    public User getCurrentUserFallback(Throwable t) {
        throw new UnauthenticatedException(
                "User service is currently unavailable. Please try again later.", t);
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileRes getProfile() {
        User user = getCurrentUser();
        UserInfo userInfo =
                userInfoRepository
                        .findByUserId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ValidationException(
                                                "User profile not found. Please create one"
                                                        + " first."));

        Setting setting =
                settingRepository
                        .findByUserInfoId(userInfo.getId())
                        .orElseThrow(() -> new ValidationException("User settings not found"));

        UserProfileRes.SettingsRes settingsRes =
                new UserProfileRes.SettingsRes(
                        setting.getTheme().name(),
                        setting.getLanguage().getCode(),
                        setting.getSpaceConfig());

        return new UserProfileRes(
                userInfo.getDisplayName(), userInfo.getBio(), userInfo.getAge(), settingsRes);
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public UserProfileRes updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();
        UserInfo userInfo = userInfoRepository.findByUserId(user.getId()).orElse(null);

        if (userInfo == null) {
            // Create default settings first
            UserInfo newUserInfo =
                    UserInfo.builder()
                            .displayName(request.displayName())
                            .bio(request.bio())
                            .age(request.age())
                            .user(user)
                            .build();
            userInfo = userInfoRepository.save(newUserInfo);

            // Create default setting
            Map<String, Integer> defaultSpaceConfig = new HashMap<>();
            defaultSpaceConfig.put("AGAIN", 1);
            defaultSpaceConfig.put("HARD", 1);
            defaultSpaceConfig.put("GOOD", 5);
            defaultSpaceConfig.put("EASY", 10);

            Setting setting =
                    Setting.builder()
                            .theme(Theme.SYSTEM)
                            .language(Language.EN_US)
                            .spaceConfig(defaultSpaceConfig)
                            .userInfo(userInfo)
                            .build();
            settingRepository.save(setting);
        } else {
            // Update existing
            userInfo.setDisplayName(request.displayName());
            userInfo.setBio(request.bio());
            userInfo.setAge(request.age());
            userInfoRepository.save(userInfo);
        }

        return getProfile();
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public UserProfileRes updateSettings(UpdateSettingsRequest request) {
        User user = getCurrentUser();
        UserInfo userInfo =
                userInfoRepository
                        .findByUserId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ValidationException(
                                                "User profile not found. Please create profile"
                                                        + " first."));

        Setting setting = settingRepository.findByUserInfoId(userInfo.getId()).orElse(null);

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

        // Convert SpaceConfigRequest to Map
        Map<String, Integer> spaceConfigMap = new HashMap<>();
        spaceConfigMap.put("AGAIN", request.spaceConfig().AGAIN());
        spaceConfigMap.put("HARD", request.spaceConfig().HARD());
        spaceConfigMap.put("GOOD", request.spaceConfig().GOOD());
        spaceConfigMap.put("EASY", request.spaceConfig().EASY());

        if (setting == null) {
            // Create new setting
            setting =
                    Setting.builder()
                            .theme(theme)
                            .language(language)
                            .spaceConfig(spaceConfigMap)
                            .userInfo(userInfo)
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
}
