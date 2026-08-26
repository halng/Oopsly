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

package com.app.oopsly.api.shared.util;

/** Gamification rules shared by review, test, garden and quiz contexts. */
public final class GamificationRules {

    private GamificationRules() {}

    // Review XP per FSRS grade (1 Again, 2 Hard, 3 Good, 4 Easy)
    public static final int XP_GRADE_AGAIN = 5;
    public static final int XP_GRADE_HARD = 10;
    public static final int XP_GRADE_GOOD = 15;
    public static final int XP_GRADE_EASY = 20;

    // Test suite
    public static final int XP_PER_CORRECT_ANSWER = 25;
    public static final int XP_TEST_COMPLETION_BONUS = 50;

    // Quiz (Kahoot style)
    public static final int QUIZ_MIN_POINTS = 10;
    public static final int QUIZ_MAX_POINTS = 1000;
    public static final int QUIZ_TIME_PENALTY_DIVISOR = 10;

    // Garden / Pomodoro
    public static final int GARDEN_DEFAULT_PLOTS = 9;
    public static final int GARDEN_FREE_PLOTS = 3;
    public static final int GARDEN_PLOT_UNLOCK_COST = 50;
    public static final int GARDEN_WATER_DEW_COST = 5;
    public static final int GARDEN_WATER_GROWTH_GAIN = 10;
    public static final int GARDEN_WATER_LEVEL_GAIN = 25;
    public static final int GARDEN_GROWTH_PER_FOCUS_MINUTE = 2;
    public static final int GARDEN_DEW_PER_SESSION = 10;
    public static final int GARDEN_SUNLIGHT_PER_SESSION = 5;
    public static final int GARDEN_COINS_PER_SESSION = 8;
    public static final int GARDEN_XP_PER_FOCUS_MINUTE = 3;
    public static final int GARDEN_STAGE_THRESHOLD = 100;

    public static int reviewXpForGrade(int grade) {
        return switch (grade) {
            case 4 -> XP_GRADE_EASY;
            case 3 -> XP_GRADE_GOOD;
            case 2 -> XP_GRADE_HARD;
            default -> XP_GRADE_AGAIN;
        };
    }

    public static int quizPoints(long elapsedMillis) {
        return Math.max(
                QUIZ_MIN_POINTS,
                (int) (QUIZ_MAX_POINTS - (elapsedMillis / QUIZ_TIME_PENALTY_DIVISOR)));
    }
}
