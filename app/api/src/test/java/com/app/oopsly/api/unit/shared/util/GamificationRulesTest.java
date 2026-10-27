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

package com.app.oopsly.api.unit.shared.util;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.shared.util.GamificationRules;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@DisplayName("GamificationRules")
class GamificationRulesTest {

    @ParameterizedTest
    @DisplayName("reviewXpForGrade should map the grade to XP when any integer grade is supplied")
    @CsvSource({
        "4,20",
        "3,15",
        "2,10",
        "1,5",
        "0,5",
        "-1,5",
        "99,5",
        "2147483647,5",
        "-2147483648,5"
    })
    void reviewXpForGrade_shouldMapGradeToXp_whenAnyIntegerGradeIsSupplied(
            int grade, int expected) {
        assertEquals(expected, GamificationRules.reviewXpForGrade(grade));
    }

    @ParameterizedTest
    @DisplayName("quizPoints should fall from the maximum to half of it across the time limit")
    @CsvSource({
        "0,20000,1000",
        "10000,20000,750",
        "20000,20000,500",
        "-500,20000,1000",
        "90000,20000,500"
    })
    void quizPoints_shouldFallLinearlyToHalf(long elapsed, long limit, int expected) {
        assertEquals(expected, GamificationRules.quizPoints(elapsed, limit));
    }

    @Test
    @DisplayName("quizPoints should return the minimum when there is no time limit")
    void quizPoints_shouldReturnMinimum_whenLimitIsMissing() {
        assertEquals(GamificationRules.QUIZ_MIN_POINTS, GamificationRules.quizPoints(100L, 0L));
    }

    @ParameterizedTest
    @DisplayName("learnXp should pay per mastered card plus a completion bonus")
    @CsvSource({"0,0", "-3,0", "1,30", "10,75"})
    void learnXp_shouldPayPerCardPlusBonus(int cards, int expected) {
        assertEquals(expected, GamificationRules.learnXp(cards));
    }

    @ParameterizedTest
    @DisplayName("matchXp should add the fast bonus only for quick, non-empty rounds")
    @CsvSource({"0,10,0", "6,0,20", "6,30,30", "6,31,20", "1,5,30"})
    void matchXp_shouldAddFastBonusOnlyWhenQuick(int pairs, int seconds, int expected) {
        assertEquals(expected, GamificationRules.matchXp(pairs, seconds));
    }

    @Test
    @DisplayName("constants should stay consistent when compared against the game design")
    void constants_shouldStayConsistent_whenComparedAgainstGameDesign() {
        assertTrue(GamificationRules.GARDEN_FREE_PLOTS < GamificationRules.GARDEN_DEFAULT_PLOTS);
        assertTrue(GamificationRules.XP_GRADE_AGAIN < GamificationRules.XP_GRADE_EASY);
        assertTrue(GamificationRules.QUIZ_MIN_POINTS < GamificationRules.QUIZ_MAX_POINTS);
        assertEquals(100, GamificationRules.GARDEN_STAGE_THRESHOLD);
    }

    @Test
    @DisplayName("constructor should stay private when the utility class is instantiated")
    void constructor_shouldStayPrivate_whenUtilityClassIsInstantiated() throws Exception {
        Constructor<GamificationRules> constructor =
                GamificationRules.class.getDeclaredConstructor();
        assertTrue(Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        assertNotNull(constructor.newInstance());
    }
}
