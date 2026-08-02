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

package com.app.oopsly.api.unit.util;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.util.FsrsAlgorithm;
import com.app.oopsly.api.util.FsrsAlgorithm.CardState;
import com.app.oopsly.api.util.FsrsAlgorithm.ScheduleResult;
import org.junit.jupiter.api.Test;

class FsrsAlgorithmTest {

    private static final CardState NEW_CARD = new CardState(0.0, 0.0, 0, 0);

    @Test
    void testNewCardAgain_returnsLowStability() {
        ScheduleResult result = FsrsAlgorithm.schedule(NEW_CARD, 1);

        assertEquals(0, result.repetitions());
        assertEquals(0, result.intervalDays());
        assertTrue(result.stability() > 0, "Stability should be positive even for Again");
        assertTrue(result.stability() < 2.0, "Stability for Again should be low");
    }

    @Test
    void testNewCardHard_returnsLowInterval() {
        ScheduleResult result = FsrsAlgorithm.schedule(NEW_CARD, 2);

        assertEquals(1, result.repetitions());
        assertEquals(1, result.intervalDays());
        assertTrue(result.stability() >= 1.0);
    }

    @Test
    void testNewCardGood_returnsModerateInterval() {
        ScheduleResult result = FsrsAlgorithm.schedule(NEW_CARD, 3);

        assertEquals(1, result.repetitions());
        assertTrue(result.intervalDays() >= 3, "GOOD should schedule ~3 days");
        assertTrue(result.stability() >= 3.0);
    }

    @Test
    void testNewCardEasy_returnsHighInterval() {
        ScheduleResult result = FsrsAlgorithm.schedule(NEW_CARD, 4);

        assertEquals(1, result.repetitions());
        assertTrue(result.intervalDays() >= 10, "EASY should schedule at least 10 days");
        assertTrue(result.stability() >= 10.0);
    }

    @Test
    void testReviewGood_increasesStability() {
        ScheduleResult firstReview = FsrsAlgorithm.schedule(NEW_CARD, 3);
        CardState afterFirst =
                new CardState(
                        firstReview.stability(),
                        firstReview.difficulty(),
                        firstReview.intervalDays(),
                        firstReview.repetitions());

        ScheduleResult secondReview = FsrsAlgorithm.schedule(afterFirst, 3);

        assertTrue(
                secondReview.stability() > firstReview.stability(),
                "Stability should increase after successful review");
        assertEquals(2, secondReview.repetitions());
    }

    @Test
    void testReviewAgain_resetsRepetitions() {
        ScheduleResult firstReview = FsrsAlgorithm.schedule(NEW_CARD, 3);
        CardState afterFirst =
                new CardState(
                        firstReview.stability(),
                        firstReview.difficulty(),
                        firstReview.intervalDays(),
                        firstReview.repetitions());

        ScheduleResult afterAgain = FsrsAlgorithm.schedule(afterFirst, 1);

        assertEquals(0, afterAgain.repetitions(), "Again should reset repetitions to 0");
        assertEquals(0, afterAgain.intervalDays(), "Again should set intervalDays to 0");
    }

    @Test
    void testRetrievability_atInterval_is90Percent() {
        double stability = 10.0;
        double elapsedDays = stability;
        double r = FsrsAlgorithm.retrievability(elapsedDays, stability);

        assertEquals(0.9, r, 0.001, "R(t=s) should be exactly 0.9 by power forgetting curve");
    }

    @Test
    void testDifficultyRange_staysWithinBounds() {
        for (int grade = 1; grade <= 4; grade++) {
            double d = FsrsAlgorithm.initDifficulty(grade);
            assertTrue(d >= 1.0 && d <= 10.0, "Initial difficulty must be in [1,10]");
        }

        double clamped = FsrsAlgorithm.clampDifficulty(15.0);
        assertEquals(10.0, clamped);

        double clampedLow = FsrsAlgorithm.clampDifficulty(-1.0);
        assertEquals(1.0, clampedLow);
    }

    @Test
    void testNextDifficulty_changesAfterReview() {
        double baseDifficulty = FsrsAlgorithm.initDifficulty(3);
        double afterHard = FsrsAlgorithm.nextDifficulty(baseDifficulty, 2);
        double afterEasy = FsrsAlgorithm.nextDifficulty(baseDifficulty, 4);

        assertTrue(afterHard > afterEasy, "Hard should produce higher difficulty than Easy");
    }

    @Test
    void testSchedule_newCard_allGrades_noException() {
        for (int grade = 1; grade <= 4; grade++) {
            final int g = grade;
            assertDoesNotThrow(
                    () -> FsrsAlgorithm.schedule(NEW_CARD, g), "Should not throw for grade " + g);
        }
    }

    @Test
    void testForgetStability_isPositive() {
        double s = FsrsAlgorithm.forgetStability(5.0, 3.0, 0.8);
        assertTrue(s > 0, "Forget stability should be positive");
    }
}
