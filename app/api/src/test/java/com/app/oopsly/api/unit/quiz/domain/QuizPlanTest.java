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

package com.app.oopsly.api.unit.quiz.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.app.oopsly.api.quiz.domain.QuizPlan;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class QuizPlanTest {

    @ParameterizedTest
    @CsvSource({"FREE,20", "PRO,50", "PRO_PLUS,100", "pro_plus,100", "' pro ',50"})
    void from_mapsPlanToRoomSize(String claim, int expected) {
        assertEquals(expected, QuizPlan.from(claim).maxPlayers());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"GOLD", ""})
    void from_fallsBackToFree(String claim) {
        assertEquals(QuizPlan.FREE, QuizPlan.from(claim));
    }
}
