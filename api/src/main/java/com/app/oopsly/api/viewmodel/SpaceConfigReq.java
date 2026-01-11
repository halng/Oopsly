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

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SpaceConfigReq(
        @NotNull(message = "AGAIN interval cannot be null") @Min(value = 0, message = "AGAIN interval cannot be negative") @Max(value = 365, message = "AGAIN interval cannot exceed 365 days") Integer AGAIN,
        @NotNull(message = "HARD interval cannot be null") @Min(value = 0, message = "HARD interval cannot be negative") @Max(value = 365, message = "HARD interval cannot exceed 365 days") Integer HARD,
        @NotNull(message = "GOOD interval cannot be null") @Min(value = 0, message = "GOOD interval cannot be negative") @Max(value = 365, message = "GOOD interval cannot exceed 365 days") Integer GOOD,
        @NotNull(message = "EASY interval cannot be null") @Min(value = 0, message = "EASY interval cannot be negative") @Max(value = 365, message = "EASY interval cannot exceed 365 days") Integer EASY) {}
