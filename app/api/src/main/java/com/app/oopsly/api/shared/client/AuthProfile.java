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

package com.app.oopsly.api.shared.client;

import java.util.UUID;

/** Public slice of a user's profile owned by the auth service. */
public record AuthProfile(
        UUID id, String name, String displayName, String pictureUrl, Integer dailyGoal) {

    public static final String UNKNOWN_NAME = "Unknown";
    public static final int DEFAULT_DAILY_GOAL = 20;

    /** Placeholder used when the auth service cannot be reached or does not know the user. */
    public static AuthProfile unknown(UUID id) {
        return new AuthProfile(id, UNKNOWN_NAME, UNKNOWN_NAME, null, DEFAULT_DAILY_GOAL);
    }

    public String label() {
        if (displayName != null && !displayName.isBlank()) {
            return displayName;
        }
        if (name != null && !name.isBlank()) {
            return name;
        }
        return UNKNOWN_NAME;
    }

    public int dailyGoalOrDefault() {
        return dailyGoal == null || dailyGoal <= 0 ? DEFAULT_DAILY_GOAL : dailyGoal;
    }
}
