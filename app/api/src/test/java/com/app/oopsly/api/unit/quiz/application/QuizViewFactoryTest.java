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

package com.app.oopsly.api.unit.quiz.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.app.oopsly.api.quiz.application.QuizViewFactory;
import com.app.oopsly.api.quiz.application.vm.PlayerResult;
import com.app.oopsly.api.quiz.application.vm.RoomView;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.quiz.domain.RoomState.Answer;
import com.app.oopsly.api.quiz.domain.RoomState.Player;
import com.app.oopsly.api.quiz.domain.RoomState.Question;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class QuizViewFactoryTest {

    private final QuizViewFactory factory =
            new QuizViewFactory(Clock.fixed(Instant.ofEpochMilli(5_000), ZoneOffset.UTC));
    private RoomState room;

    @BeforeEach
    void setUp() {
        room = new RoomState();
        room.setCode("123456");
        room.setMaxPlayers(20);
        Question single = new Question();
        single.setText("Pick b");
        single.setType("SINGLE_CHOICE");
        single.setOptions(List.of("a", "b", "c"));
        single.setCorrectIndex(1);
        single.setExplanation("because");
        Question blank = new Question();
        blank.setText("Fill ___");
        blank.setType("FILL_IN_THE_BLANK");
        blank.setAcceptedAnswers(List.of("x", "y"));
        Question multi = new Question();
        multi.setText("Pick a, c");
        multi.setType("MULTIPLE_CHOICE");
        multi.setOptions(List.of("a", "b", "c"));
        multi.setCorrectIndexes(List.of(0, 2));
        room.setQuestions(List.of(single, blank, multi));
        room.getPlayers().put("k1", player("p1", "Ana", 900, 1, 0, true, 900, 2_000));
        room.getPlayers().put("k2", player("p2", "Ben", 900, 0, 0, false, 0, 4_000));
        room.getPlayers().put("k3", player("p3", "Cy", 100, 0, 0, null));
    }

    @Test
    void lobbyShowsPlayersButNoQuestionOrAnswers() {
        RoomView view = factory.roomView(room);

        assertEquals(QuizState.LOBBY, view.state());
        assertNull(view.question());
        assertNull(view.reveal());
        assertEquals(3, view.playerCount());
        assertEquals(5_000, view.serverTime());
        assertTrue(view.leaderboard().isEmpty());
    }

    @Test
    void openQuestionHidesTheAnswer() {
        room.setState(QuizState.QUESTION);
        room.setCurrentIndex(0);

        RoomView view = factory.roomView(room);

        assertEquals(List.of("a", "b", "c"), view.question().options());
        assertEquals(2, view.answeredCount());
        assertNull(view.reveal());
        assertTrue(view.leaderboard().isEmpty());
    }

    @Test
    void revealCarriesStatisticsAndRankedLeaderboard() {
        room.setState(QuizState.REVEAL);
        room.setCurrentIndex(0);

        RoomView view = factory.roomView(room);

        assertEquals(List.of(1), view.reveal().correctIndexes());
        assertEquals("b", view.reveal().correctText());
        assertEquals(List.of(0, 1, 1), view.reveal().distribution());
        assertEquals(1, view.reveal().correctCount());
        assertEquals(2, view.reveal().answeredCount());
        assertEquals(3.0, view.reveal().averageSeconds());
        assertEquals(1, view.leaderboard().get(0).rank());
        assertEquals(1, view.leaderboard().get(1).rank());
        assertEquals(3, view.leaderboard().get(2).rank());
        assertEquals(900, view.leaderboard().get(0).delta());
    }

    @Test
    void revealHandlesFillInAndMultipleChoiceQuestions() {
        room.setState(QuizState.REVEAL);
        room.setCurrentIndex(1);
        RoomView fill = factory.roomView(room);
        assertEquals("x / y", fill.reveal().correctText());
        assertTrue(fill.reveal().correctIndexes().isEmpty());
        assertEquals(0.0, fill.reveal().averageSeconds());

        room.setCurrentIndex(2);
        room.getPlayers().get("k1").getAnswers().put(2, multiAnswer());
        RoomView multi = factory.roomView(room);
        assertEquals("a / c", multi.reveal().correctText());
        assertEquals(List.of(1, 0, 1), multi.reveal().distribution());
    }

    @Test
    void finishedShowsFullStandingsAndPerQuestionSummary() {
        room.setState(QuizState.FINISHED);
        room.setCurrentIndex(2);

        RoomView view = factory.roomView(room);

        assertEquals(3, view.leaderboard().size());
        assertEquals(3, view.summary().size());
        assertEquals(1, view.summary().get(0).correct());
        assertEquals(2, view.summary().get(0).answered());
    }

    @Test
    void resultsDescribeEachPlayersLastQuestion() {
        room.setState(QuizState.REVEAL);
        room.setCurrentIndex(0);

        Map<String, PlayerResult> results = factory.results(room);

        assertEquals(new PlayerResult(true, true, 900, 900, 1, 1), results.get("k1"));
        assertEquals(new PlayerResult(true, false, 0, 900, 1, 0), results.get("k2"));
        assertEquals(new PlayerResult(false, false, 0, 100, 3, 0), results.get("k3"));
    }

    private static Player player(
            String id, String name, int score, int streak, int index, Boolean correct) {
        return player(id, name, score, streak, index, correct != null && correct, 0, 0);
    }

    private static Player player(
            String id,
            String name,
            int score,
            int streak,
            int index,
            boolean correct,
            int points,
            long elapsed) {
        Player player = new Player();
        player.setId(id);
        player.setName(name);
        player.setScore(score);
        player.setStreak(streak);
        if (elapsed > 0) {
            Answer answer = new Answer();
            answer.setIndex(correct ? 1 : 2);
            answer.setCorrect(correct);
            answer.setPoints(points);
            answer.setElapsedMs(elapsed);
            player.getAnswers().put(index, answer);
        }
        return player;
    }

    private static Answer multiAnswer() {
        Answer answer = new Answer();
        answer.setIndexes(List.of(0, 2));
        answer.setCorrect(true);
        return answer;
    }
}
