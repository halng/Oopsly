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

/** Resilience4j circuit breaker instance names (must match application.yaml). */
public final class CircuitBreakerNames {

    private CircuitBreakerNames() {}

    public static final String USER = "userServiceCircuitBreaker";
    public static final String CARD = "cardServiceCircuitBreaker";
    public static final String SUBJECT = "subjectServiceCircuitBreaker";
    public static final String SHELF = "shelveServiceCircuitBreaker";
    public static final String TEST_SUITE = "testSuiteServiceCircuitBreaker";
    public static final String QUESTION = "questionServiceCircuitBreaker";
    public static final String OTP = "otpServiceCircuitBreaker";
    public static final String COMMUNITY = "communityServiceCircuitBreaker";
    public static final String LEADERBOARD = "leaderboardServiceCircuitBreaker";
    public static final String GARDEN = "gardenServiceCircuitBreaker";
    public static final String QUIZ = "quizServiceCircuitBreaker";
    public static final String STATS = "statsServiceCircuitBreaker";
    public static final String DISCOVER = "discoverServiceCircuitBreaker";
    public static final String AI = "aiServiceCircuitBreaker";
}
