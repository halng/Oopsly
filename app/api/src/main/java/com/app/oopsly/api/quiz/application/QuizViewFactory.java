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

package com.app.oopsly.api.quiz.application;

import com.app.oopsly.api.quiz.application.vm.PlayerResult;
import com.app.oopsly.api.quiz.application.vm.RoomView;
import com.app.oopsly.api.quiz.application.vm.RoomView.PlayerView;
import com.app.oopsly.api.quiz.application.vm.RoomView.QuestionSummary;
import com.app.oopsly.api.quiz.application.vm.RoomView.QuestionView;
import com.app.oopsly.api.quiz.application.vm.RoomView.RankView;
import com.app.oopsly.api.quiz.application.vm.RoomView.RevealView;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.quiz.domain.RoomState.Answer;
import com.app.oopsly.api.quiz.domain.RoomState.Player;
import com.app.oopsly.api.quiz.domain.RoomState.Question;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Turns the stored room into what clients may see at the current phase. */
@Component
@RequiredArgsConstructor
public class QuizViewFactory {

    /** Players shown on the leaderboard between questions. */
    static final int TOP_PLAYERS = 5;

    private final Clock clock;

    public RoomView roomView(RoomState room) {
        int index = room.getCurrentIndex();
        boolean live = room.getState() == QuizState.QUESTION || room.getState() == QuizState.REVEAL;
        Question question = live ? room.getQuestions().get(index) : null;
        boolean reveal = room.getState() == QuizState.REVEAL;
        boolean finished = room.getState() == QuizState.FINISHED;

        List<RankView> ranking = ranking(room);
        List<PlayerView> players =
                room.getPlayers().values().stream()
                        .map(
                                p ->
                                        new PlayerView(
                                                p.getId(),
                                                p.getName(),
                                                p.isConnected(),
                                                live && p.getAnswers().containsKey(index)))
                        .toList();

        return new RoomView(
                room.getCode(),
                room.getState(),
                room.getMode(),
                room.getTitle(),
                room.getHostName(),
                room.getMaxPlayers(),
                room.getQuestionSeconds(),
                room.getQuestions().size(),
                index,
                clock.millis(),
                room.getDeadline(),
                question == null ? null : questionView(question),
                live ? (int) players.stream().filter(PlayerView::answered).count() : 0,
                players.size(),
                players,
                reveal ? revealView(room, question) : null,
                reveal
                        ? ranking.stream().limit(TOP_PLAYERS).toList()
                        : finished ? ranking : List.of(),
                finished ? summary(room) : List.of());
    }

    /** Per player outcome of the question that just closed, keyed by player key. */
    public Map<String, PlayerResult> results(RoomState room) {
        List<RankView> ranking = ranking(room);
        Map<String, Integer> rankById = new LinkedHashMap<>();
        ranking.forEach(r -> rankById.put(r.id(), r.rank()));
        Map<String, PlayerResult> results = new LinkedHashMap<>();
        for (Map.Entry<String, Player> entry : room.getPlayers().entrySet()) {
            Player player = entry.getValue();
            Answer answer = player.getAnswers().get(room.getCurrentIndex());
            results.put(
                    entry.getKey(),
                    new PlayerResult(
                            answer != null,
                            answer != null && answer.isCorrect(),
                            answer == null ? 0 : answer.getPoints(),
                            player.getScore(),
                            rankById.getOrDefault(player.getId(), 0),
                            player.getStreak()));
        }
        return results;
    }

    private QuestionView questionView(Question question) {
        return new QuestionView(
                question.getId(), question.getText(), question.getType(), question.getOptions());
    }

    private RevealView revealView(RoomState room, Question question) {
        int index = room.getCurrentIndex();
        int options = question.getOptions().size();
        int[] counts = new int[options];
        int answered = 0;
        int correct = 0;
        long elapsed = 0;
        for (Player player : room.getPlayers().values()) {
            Answer answer = player.getAnswers().get(index);
            if (answer == null) {
                continue;
            }
            answered++;
            elapsed += answer.getElapsedMs();
            if (answer.isCorrect()) {
                correct++;
            }
            if (answer.getIndex() != null
                    && answer.getIndex() >= 0
                    && answer.getIndex() < options) {
                counts[answer.getIndex()]++;
            }
            for (Integer picked : answer.getIndexes()) {
                if (picked != null && picked >= 0 && picked < options) {
                    counts[picked]++;
                }
            }
        }
        List<Integer> distribution = new ArrayList<>();
        for (int count : counts) {
            distribution.add(count);
        }
        return new RevealView(
                correctIndexes(question),
                correctText(question),
                question.getExplanation(),
                distribution,
                correct,
                answered,
                answered == 0 ? 0 : Math.round(elapsed / (double) answered / 100.0) / 10.0);
    }

    private List<QuestionSummary> summary(RoomState room) {
        List<QuestionSummary> summary = new ArrayList<>();
        for (int i = 0; i < room.getQuestions().size(); i++) {
            int answered = 0;
            int correct = 0;
            for (Player player : room.getPlayers().values()) {
                Answer answer = player.getAnswers().get(i);
                if (answer != null) {
                    answered++;
                    if (answer.isCorrect()) {
                        correct++;
                    }
                }
            }
            summary.add(
                    new QuestionSummary(room.getQuestions().get(i).getText(), correct, answered));
        }
        return summary;
    }

    private List<RankView> ranking(RoomState room) {
        int index = room.getCurrentIndex();
        List<Player> sorted =
                room.getPlayers().values().stream()
                        .sorted(Comparator.comparingInt(Player::getScore).reversed())
                        .toList();
        List<RankView> ranking = new ArrayList<>();
        int rank = 0;
        int previousScore = Integer.MIN_VALUE;
        for (int i = 0; i < sorted.size(); i++) {
            Player player = sorted.get(i);
            if (player.getScore() != previousScore) {
                rank = i + 1;
                previousScore = player.getScore();
            }
            Answer answer = player.getAnswers().get(index);
            ranking.add(
                    new RankView(
                            player.getId(),
                            player.getName(),
                            player.getScore(),
                            rank,
                            answer == null ? 0 : answer.getPoints(),
                            player.getStreak()));
        }
        return ranking;
    }

    private static List<Integer> correctIndexes(Question question) {
        if (QuestionType.MULTIPLE_CHOICE.name().equals(question.getType())) {
            return question.getCorrectIndexes();
        }
        if (QuestionType.FILL_IN_THE_BLANK.name().equals(question.getType())
                || question.getCorrectIndex() == null) {
            return List.of();
        }
        return List.of(question.getCorrectIndex());
    }

    private static String correctText(Question question) {
        if (QuestionType.FILL_IN_THE_BLANK.name().equals(question.getType())) {
            return String.join(" / ", question.getAcceptedAnswers());
        }
        List<String> texts = new ArrayList<>();
        for (Integer i : correctIndexes(question)) {
            if (i >= 0 && i < question.getOptions().size()) {
                texts.add(question.getOptions().get(i));
            }
        }
        return String.join(" / ", texts);
    }
}
