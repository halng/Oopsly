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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Whole live state of one room, stored as a single JSON document in Redis. */
@Getter
@Setter
@NoArgsConstructor
public class RoomState {

    private String code;
    private String hostId;
    private String hostName;
    private String title;
    private QuizMode mode = QuizMode.MANUAL;
    private QuizState state = QuizState.LOBBY;
    private int maxPlayers;
    private int questionSeconds;
    private int currentIndex = -1;
    private long questionStartedAt;

    /** Epoch millis when the current phase ends on its own, 0 when it waits for the host. */
    private long deadline;

    private List<Question> questions = new ArrayList<>();

    /** Players keyed by their private session key (user id or guest id). */
    private Map<String, Player> players = new LinkedHashMap<>();

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Question {
        private String id;
        private String text;
        private String type;
        private List<String> options = new ArrayList<>();
        private Integer correctIndex;
        private List<Integer> correctIndexes = new ArrayList<>();
        private List<String> acceptedAnswers = new ArrayList<>();
        private boolean caseSensitive;
        private String explanation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Player {
        /** Public id shown to the room; the map key stays private. */
        private String id;

        private String name;
        private boolean guest;
        private boolean connected = true;
        private int score;
        private int streak;

        /** Answers keyed by question index. */
        private Map<Integer, Answer> answers = new LinkedHashMap<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Answer {
        private Integer index;
        private List<Integer> indexes = new ArrayList<>();
        private String text;
        private boolean correct;
        private int points;
        private long elapsedMs;
    }
}
