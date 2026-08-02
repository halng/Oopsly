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

package com.app.oopsly.api.util;

/**
 * FSRS-4.5 spaced repetition algorithm implementation.
 *
 * <p>Grades: 1=Again, 2=Hard, 3=Good, 4=Easy
 */
public final class FsrsAlgorithm {

    private static final double[] W = {
        0.40255, 1.18385, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 0.3195, 0.0, 1.3373,
        0.2946, 0.5012, 0.0025, 0.1398, 1.1695, 2.4
    };

    private static final double MIN_STABILITY = 0.1;

    private FsrsAlgorithm() {}

    public record CardState(
            double stability, double difficulty, int intervalDays, int repetitions) {}

    public record ScheduleResult(
            double stability, double difficulty, int intervalDays, int repetitions) {}

    public static ScheduleResult schedule(CardState card, int grade) {
        if (card.repetitions() == 0) {
            return scheduleNew(grade);
        }

        if (grade == 1) {
            // Again: reset
            double s = forgetStability(card.difficulty(), card.stability(), 0.9);
            double d = nextDifficulty(card.difficulty(), grade);
            return new ScheduleResult(Math.max(s, MIN_STABILITY), d, 0, 0);
        }

        double elapsedDays = Math.max(card.intervalDays(), 1);
        return scheduleReview(card, grade, elapsedDays);
    }

    private static ScheduleResult scheduleNew(int grade) {
        double s = Math.max(W[grade - 1], MIN_STABILITY);
        double d = initDifficulty(grade);
        int interval = grade == 1 ? 0 : Math.max(1, (int) Math.round(s));
        int repetitions = grade == 1 ? 0 : 1;
        return new ScheduleResult(s, d, interval, repetitions);
    }

    private static ScheduleResult scheduleReview(CardState card, int grade, double elapsedDays) {
        double r = retrievability(elapsedDays, card.stability());
        double s = recallStability(card.difficulty(), card.stability(), r, grade);
        double d = nextDifficulty(card.difficulty(), grade);
        int interval = Math.max(1, (int) Math.round(s));
        return new ScheduleResult(Math.max(s, MIN_STABILITY), d, interval, card.repetitions() + 1);
    }

    public static double retrievability(double elapsedDays, double stability) {
        return Math.pow(1.0 + elapsedDays / (9.0 * stability), -1.0);
    }

    public static double initDifficulty(int grade) {
        double d = W[4] - Math.exp(W[5] * (grade - 1)) + 1;
        return clampDifficulty(d);
    }

    public static double nextDifficulty(double d, int grade) {
        double d0 = initDifficulty(4);
        double dPrime = d + W[6] * (3 - grade);
        double meanReverted = W[7] * d0 + (1.0 - W[7]) * dPrime;
        return clampDifficulty(meanReverted);
    }

    public static double recallStability(double d, double s, double r, int grade) {
        double hardPenalty = (grade == 2) ? W[15] : 1.0;
        double easyBonus = (grade == 4) ? W[16] : 1.0;
        double stabilityBase = Math.max(s, 0.1);
        double sNew =
                s
                        * (Math.exp(W[8])
                                        * (11.0 - d)
                                        * Math.pow(stabilityBase, -W[9])
                                        * (Math.exp(W[10] * (1.0 - r)) - 1.0)
                                + 1.0)
                        * hardPenalty
                        * easyBonus;
        return Math.max(sNew, MIN_STABILITY);
    }

    public static double forgetStability(double d, double s, double r) {
        return W[11]
                * Math.pow(d, -W[12])
                * (Math.pow(s + 1.0, W[13]) - 1.0)
                * Math.exp(W[14] * (1.0 - r));
    }

    public static double clampDifficulty(double d) {
        return Math.max(1.0, Math.min(10.0, d));
    }
}
