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
package com.app.quizi.api.shared.plan;

/** What one subscription plan may hold. */
public record PlanLimits(
        String planName,
        int decks,
        int subjectsPerDeck,
        int testSuitesPerDeck,
        int cardsPerSubject,
        int questionsPerTestSuite) {

    public static final String FREE_PLAN = "FREE";
    public static final String PRO_PLAN = "PRO";
    public static final String PRO_PLUS_PLAN = "PRO_PLUS";

    /** No cap: no count can pass it. */
    public static final int UNLIMITED = Integer.MAX_VALUE;

    private static final PlanLimits FREE_LIMITS = new PlanLimits("Free", 10, 5, 5, 25, 25);
    private static final PlanLimits PRO_LIMITS = new PlanLimits("Pro", 50, 20, 20, 100, 100);
    private static final PlanLimits PRO_PLUS_LIMITS =
            new PlanLimits("Pro Plus", UNLIMITED, UNLIMITED, UNLIMITED, UNLIMITED, UNLIMITED);

    /** A token without a plan claim, or an unknown plan, gets the free limits. */
    public static PlanLimits forPlan(String plan) {
        if (PRO_PLAN.equalsIgnoreCase(plan)) {
            return PRO_LIMITS;
        }
        if (PRO_PLUS_PLAN.equalsIgnoreCase(plan)) {
            return PRO_PLUS_LIMITS;
        }
        return FREE_LIMITS;
    }
}
