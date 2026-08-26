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

package com.app.oopsly.api.unit.leaderboard.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.leaderboard.domain.League;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class LeagueTest {

    @ParameterizedTest
    @CsvSource({
        "0,BRONZE",
        "1,BRONZE",
        "999,BRONZE",
        "1000,SILVER",
        "2999,SILVER",
        "3000,GOLD",
        "5999,GOLD",
        "6000,EMERALD",
        "9999,EMERALD",
        "10000,DIAMOND",
        "2147483647,DIAMOND"
    })
    void of_resolvesLeagueAtEveryBoundary(int xp, String expected) {
        assertEquals(League.valueOf(expected), League.of(xp));
    }

    @Test
    void of_negativeXpFallsBackToBronze() {
        assertEquals(League.BRONZE, League.of(-1));
        assertEquals(League.BRONZE, League.of(Integer.MIN_VALUE));
    }

    @Test
    void minXp_isStrictlyIncreasing() {
        League[] leagues = League.values();
        for (int i = 1; i < leagues.length; i++) {
            assertTrue(leagues[i].minXp() > leagues[i - 1].minXp());
        }
    }

    @Test
    void valuesAndValueOf_areStable() {
        assertEquals(5, League.values().length);
        assertEquals(League.DIAMOND, League.valueOf("DIAMOND"));
        assertThrows(IllegalArgumentException.class, () -> League.valueOf("PLATINUM"));
    }
}
