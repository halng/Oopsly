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

package com.app.oopsly.api.quiz.application.vm;

/** Private message for a single socket user. {@code type}: joined, accepted, result or error. */
public record QuizUserEvent(String type, String message, String playerId, PlayerResult result) {

    public static QuizUserEvent joined(String playerId) {
        return new QuizUserEvent("joined", null, playerId, null);
    }

    public static QuizUserEvent accepted() {
        return new QuizUserEvent("accepted", null, null, null);
    }

    public static QuizUserEvent result(PlayerResult result) {
        return new QuizUserEvent("result", null, null, result);
    }

    public static QuizUserEvent error(String message) {
        return new QuizUserEvent("error", message, null, null);
    }
}
