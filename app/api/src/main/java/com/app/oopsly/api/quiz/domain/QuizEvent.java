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

package com.app.oopsly.api.quiz.domain;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Message carried on the Redis channel. {@code ROOM} events go to everyone subscribed to a room
 * topic; {@code USER} events go to one player's private queue.
 */
public record QuizEvent(Kind kind, String code, String playerKey, JsonNode body) {

    public enum Kind {
        ROOM,
        USER
    }

    public static QuizEvent room(String code, JsonNode body) {
        return new QuizEvent(Kind.ROOM, code, null, body);
    }

    public static QuizEvent user(String playerKey, JsonNode body) {
        return new QuizEvent(Kind.USER, null, playerKey, body);
    }
}
