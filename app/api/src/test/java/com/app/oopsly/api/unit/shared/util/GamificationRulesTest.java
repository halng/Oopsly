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

    @Test
    @DisplayName("quizPoints should award the maximum when the answer is instant")
    void quizPoints_shouldAwardMaximum_whenAnswerIsInstant() {
        assertEquals(GamificationRules.QUIZ_MAX_POINTS, GamificationRules.quizPoints(0L));
    }

    @Test
    @DisplayName("quizPoints should decay linearly when time elapses")
    void quizPoints_shouldDecayLinearly_whenTimeElapses() {
        assertEquals(900, GamificationRules.quizPoints(1_000L));
        assertEquals(500, GamificationRules.quizPoints(5_000L));
    }

    @Test
    @DisplayName("quizPoints should clamp to the minimum when the answer is very late")
    void quizPoints_shouldClampToMinimum_whenAnswerIsVeryLate() {
        assertEquals(GamificationRules.QUIZ_MIN_POINTS, GamificationRules.quizPoints(60_000L));
        assertEquals(GamificationRules.QUIZ_MIN_POINTS, GamificationRules.quizPoints(10_000_000L));
    }

    @Test
    @DisplayName("quizPoints should stay at the maximum when the elapsed time is negative")
    void quizPoints_shouldStayAtMaximum_whenElapsedTimeIsNegative() {
        assertTrue(GamificationRules.quizPoints(-1_000L) >= GamificationRules.QUIZ_MAX_POINTS);
    }

    @Test
    @DisplayName("quizPoints should return the minimum when the elapsed time hits the boundary")
    void quizPoints_shouldReturnMinimum_whenElapsedTimeHitsBoundary() {
        long boundary =
                (long) (GamificationRules.QUIZ_MAX_POINTS - GamificationRules.QUIZ_MIN_POINTS)
                        * GamificationRules.QUIZ_TIME_PENALTY_DIVISOR;
        assertEquals(GamificationRules.QUIZ_MIN_POINTS, GamificationRules.quizPoints(boundary));
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
