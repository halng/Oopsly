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

package com.app.oopsly.api.garden.application.vm;

import com.app.oopsly.api.garden.domain.SessionMode;
import com.app.oopsly.api.garden.domain.Soundscape;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Request reporting a completed pomodoro session. */
public record CompletePomodoroReq(
        @NotNull @Min(1) Integer focusDurationMinutes,
        Integer breakDurationMinutes,
        SessionMode mode,
        Soundscape soundscape,
        UUID subjectId) {}
