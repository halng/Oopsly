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

package com.app.oopsly.api.viewmodel;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateSettingsReq(
        @NotBlank(message = "Theme cannot be blank") String theme,
        @NotBlank(message = "Language cannot be blank") String language,
        @NotNull(message = "Space configuration cannot be null") @Valid SpaceConfigReq spaceConfig,
        @NotNull(message = "Study schedule cannot be null") @Valid StudyScheduleReq studySchedule) {}
