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

import com.app.oopsly.api.quiz.domain.QuizMode;
import com.app.oopsly.api.quiz.domain.QuizState;
import java.util.List;

/** Public state broadcast to every member of a room. It never carries answers before reveal. */
public record RoomView(
        String code,
        QuizState state,
        QuizMode mode,
        String title,
        String hostName,
        int maxPlayers,
        int questionSeconds,
        int totalQuestions,
        int questionIndex,
        long serverTime,
        long deadline,
        QuestionView question,
        int answeredCount,
        int playerCount,
        List<PlayerView> players,
        RevealView reveal,
        List<RankView> leaderboard,
        List<QuestionSummary> summary) {

    /** Question as players see it. */
    public record QuestionView(String id, String text, String type, List<String> options) {}

    public record PlayerView(String id, String name, boolean connected, boolean answered) {}

    public record RankView(String id, String name, int score, int rank, int delta, int streak) {}

    /** Statistics of the question that just closed. */
    public record RevealView(
            List<Integer> correctIndexes,
            String correctText,
            String explanation,
            List<Integer> distribution,
            int correctCount,
            int answeredCount,
            double averageSeconds) {}

    /** One line of the end-of-game report. */
    public record QuestionSummary(String text, int correct, int answered) {}
}
