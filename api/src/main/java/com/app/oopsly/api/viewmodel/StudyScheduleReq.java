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

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;

/**
 * Study schedule update payload.
 *
 * <p>studyDays: 0=Sunday … 6=Saturday (JS Date.getDay() convention).
 */
public record StudyScheduleReq(
        @NotBlank(message = "Preferred study time cannot be blank") @Pattern(
                        regexp = "^([01]\\d|2[0-3]):[0-5]\\d$",
                        message = "Preferred study time must be HH:mm (24h)")
                String preferredStudyTime,
        @NotNull(message = "Study days cannot be null") List<Integer> studyDays,
        @NotNull(message = "Reminder enabled flag cannot be null") Boolean reminderEnabled) {}
