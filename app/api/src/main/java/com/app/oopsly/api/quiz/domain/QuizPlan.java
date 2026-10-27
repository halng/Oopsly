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

package com.app.oopsly.api.quiz.domain;

import java.util.Locale;

/** Subscription plans of the auth service and the room size each one hosts. */
public enum QuizPlan {
    FREE(20),
    PRO(50),
    PRO_PLUS(100);

    private final int maxPlayers;

    QuizPlan(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public int maxPlayers() {
        return maxPlayers;
    }

    /** Unknown or missing claims (tokens issued before plans existed) fall back to FREE. */
    public static QuizPlan from(String claim) {
        if (claim == null) {
            return FREE;
        }
        try {
            return valueOf(claim.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return FREE;
        }
    }
}
