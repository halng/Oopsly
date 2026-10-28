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

/** Destinations and constants of the realtime quiz protocol. */
public final class QuizChannels {

    private QuizChannels() {}

    public static final String ENDPOINT = "/ws";
    public static final String APP_PREFIX = "/app";
    public static final String TOPIC_PREFIX = "/topic";
    public static final String QUEUE_PREFIX = "/queue";
    public static final String USER_PREFIX = "/user";

    public static final String TOPIC_QUIZ = "/topic/quiz/";
    public static final String USER_QUEUE_QUIZ = "/queue/quiz";

    /** Redis pub/sub channel that fans room and private events out to every API instance. */
    public static final String REDIS_CHANNEL = "quiz:events";

    public static String roomTopic(String roomCode) {
        return TOPIC_QUIZ + roomCode;
    }
}
