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

package com.app.oopsly.api.user.application;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.user.application.vm.RefreshTokenReq;
import com.app.oopsly.api.user.application.vm.UpdateProfileReq;
import com.app.oopsly.api.user.application.vm.UpdateSettingsReq;
import com.app.oopsly.api.user.domain.User;

public interface UserService {
    String getCurrentUserId();

    User getCurrentUser();

    ApiRes getProfile();

    ApiRes updateProfile(UpdateProfileReq request);

    ApiRes updateSettings(UpdateSettingsReq request);

    ApiRes refreshToken(RefreshTokenReq refreshTokenReq);

    ApiRes logout();

    ApiRes validateToken();

    void updateUserProgress(int xpGained);
}
