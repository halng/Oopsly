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

package com.app.oopsly.api.leaderboard.domain;

/** Leagues derived from the total XP of a learner. */
public enum League {
    BRONZE(0),
    SILVER(1000),
    GOLD(3000),
    EMERALD(6000),
    DIAMOND(10000);

    private final int minXp;

    League(int minXp) {
        this.minXp = minXp;
    }

    public int minXp() {
        return minXp;
    }

    public static League of(int xp) {
        League current = BRONZE;
        for (League league : values()) {
            if (xp >= league.minXp) {
                current = league;
            }
        }
        return current;
    }
}
