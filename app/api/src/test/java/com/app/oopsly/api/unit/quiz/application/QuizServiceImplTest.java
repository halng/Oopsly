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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.quiz.application.QuizServiceImpl;
import com.app.oopsly.api.quiz.application.vm.*;
import com.app.oopsly.api.quiz.domain.QuizPlayerEntity;
import com.app.oopsly.api.quiz.domain.QuizSessionEntity;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.infrastructure.QuizLiveStateStore;
import com.app.oopsly.api.quiz.infrastructure.QuizPlayerRepository;
import com.app.oopsly.api.quiz.infrastructure.QuizSessionRepository;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuizServiceImplTest {

    private static final String ROOM = "123456";

    @Mock private QuizSessionRepository sessionRepository;
    @Mock private QuizPlayerRepository playerRepository;
    @Mock private QuizLiveStateStore liveStateStore;
    @Mock private UserService userService;

    @InjectMocks private QuizServiceImpl quizService;

    private User host;
    private QuizSessionEntity session;
    private List<QuizCardView> cards;

    @BeforeEach
    void setUp() {
        host = new User();
        host.setId(UUID.randomUUID());
        host.setName("Host");
        host.setDisplayName("Host display");

        cards =
                List.of(
                        new QuizCardView(UUID.randomUUID(), "2 + 2", "4"),
                        new QuizCardView(UUID.randomUUID(), "Capital of France", "Paris"));

        session = session(QuizState.LOBBY, -1);
    }

    private QuizSessionEntity session(QuizState state, int index) {
        QuizSessionEntity entity =
                QuizSessionEntity.builder()
                        .roomCode(ROOM)
                        .host(host)
                        .subjectId(UUID.randomUUID())
                        .subjectTitle("Maths")
                        .state(state)
                        .currentQuestionIndex(index)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private QuizPlayerEntity player(String name, String sessionKey, Integer score, String answer) {
        QuizPlayerEntity entity =
                QuizPlayerEntity.builder()
                        .session(session)
                        .displayName(name)
                        .sessionKey(sessionKey)
                        .score(score)
                        .currentAnswer(answer)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    // ------------------------------------------------------------ createRoom

    @Test
    void createRoom_generatesUniqueRoomCodeAndCachesCards() {
        when(userService.getCurrentUser()).thenReturn(host);
        when(sessionRepository.existsByRoomCode(anyString())).thenReturn(true, false);
        when(sessionRepository.saveAndFlush(any(QuizSessionEntity.class)))
                .thenAnswer(
                        inv -> {
                            QuizSessionEntity saved = inv.getArgument(0);
                            saved.setId(UUID.randomUUID());
                            return saved;
                        });
        when(liveStateStore.getCards(anyString())).thenReturn(cards);
        when(playerRepository.findAllBySessionId(any())).thenReturn(List.of());

        QuizStateView state =
                quizService.createRoom(
                        new CreateQuizReq(UUID.randomUUID(), "Maths", cards), "host-key");

        assertEquals(QuizState.LOBBY, state.state());
        assertEquals(-1, state.currentQuestionIndex());
        assertEquals(2, state.totalQuestions());
        assertNull(state.currentCard());
        assertEquals(host.getId(), state.hostId());
        assertEquals("Host display", state.hostName());
        assertEquals(6, state.roomCode().length());
        verify(sessionRepository, times(2)).existsByRoomCode(anyString());
        verify(liveStateStore).saveCards(state.roomCode(), cards);
    }

    @Test
    void createRoom_fallsBackToTechnicalNameWhenNoDisplayName() {
        host.setDisplayName(null);
        when(userService.getCurrentUser()).thenReturn(host);
        when(sessionRepository.existsByRoomCode(anyString())).thenReturn(false);
        when(sessionRepository.saveAndFlush(any(QuizSessionEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(liveStateStore.getCards(anyString())).thenReturn(List.of());
        when(playerRepository.findAllBySessionId(any())).thenReturn(List.of());

        QuizStateView state =
                quizService.createRoom(new CreateQuizReq(UUID.randomUUID(), null, List.of()), "k");

        assertEquals("Host", state.hostName());
        assertEquals(0, state.totalQuestions());
    }

    // ------------------------------------------------------------------ join

    @Test
    void join_addsPlayerToLobby() {
        QuizPlayerEntity joined = player("Ana", "p1", 0, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of(joined));

        QuizStateView state = quizService.join(ROOM, new JoinQuizReq("Ana"), "p1");

        assertEquals(1, state.players().size());
        assertEquals("Ana", state.players().get(0).displayName());
        assertFalse(state.players().get(0).hasAnswered());
        ArgumentCaptor<QuizPlayerEntity> captor = ArgumentCaptor.forClass(QuizPlayerEntity.class);
        verify(playerRepository).saveAndFlush(captor.capture());
        assertEquals("p1", captor.getValue().getSessionKey());
        assertEquals(0, captor.getValue().getScore());
    }

    @Test
    void join_afterStartIsRejected() {
        session = session(QuizState.QUESTION, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));

        JoinQuizReq request = new JoinQuizReq("Late");
        assertThrows(ValidationException.class, () -> quizService.join(ROOM, request, "p1"));
        verify(playerRepository, never()).saveAndFlush(any());
    }

    @Test
    void join_unknownRoomThrowsNotFound() {
        when(sessionRepository.findByRoomCode("000000")).thenReturn(Optional.empty());

        JoinQuizReq request = new JoinQuizReq("Ana");
        assertThrows(NotFoundException.class, () -> quizService.join("000000", request, "p1"));
    }

    // ----------------------------------------------------------------- start

    @Test
    void start_movesRoomToFirstQuestionAndResetsAnswers() {
        QuizPlayerEntity playerA = player("Ana", "p1", 0, "stale");
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(host);
        when(sessionRepository.saveAndFlush(session)).thenReturn(session);
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        QuizStateView state = quizService.start(ROOM, "host-key");

        assertEquals(QuizState.QUESTION, state.state());
        assertEquals(0, state.currentQuestionIndex());
        assertEquals(cards.get(0), state.currentCard());
        assertNull(playerA.getCurrentAnswer());
        assertNotNull(session.getQuestionStartedAt());
        verify(playerRepository).saveAll(List.of(playerA));
    }

    @Test
    void start_byNonHostIsRejected() {
        User intruder = new User();
        intruder.setId(UUID.randomUUID());
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(intruder);

        assertThrows(ValidationException.class, () -> quizService.start(ROOM, "spoofed"));
        verify(sessionRepository, never()).saveAndFlush(any());
    }

    // ---------------------------------------------------------- submitAnswer

    @Test
    void submitAnswer_correctAnswerScoresPoints() {
        session = session(QuizState.QUESTION, 0);
        session.setQuestionStartedAt(Instant.now());
        QuizPlayerEntity playerA = player("Ana", "p1", 0, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        AnswerFeedback feedback = quizService.submitAnswer(ROOM, new SubmitAnswerReq("  4 "), "p1");

        assertTrue(feedback.isCorrect());
        assertTrue(feedback.pointsGained() >= GamificationRules.QUIZ_MIN_POINTS);
        assertEquals(feedback.pointsGained(), feedback.totalScore());
        assertEquals("  4 ", playerA.getCurrentAnswer());
    }

    @Test
    void submitAnswer_isCaseInsensitive() {
        session = session(QuizState.QUESTION, 1);
        session.setQuestionStartedAt(Instant.now());
        QuizPlayerEntity playerA = player("Ana", "p1", 100, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        AnswerFeedback feedback =
                quizService.submitAnswer(ROOM, new SubmitAnswerReq("paris"), "p1");

        assertTrue(feedback.isCorrect());
        assertTrue(feedback.totalScore() > 100);
    }

    @Test
    void submitAnswer_wrongAnswerScoresNothing() {
        session = session(QuizState.QUESTION, 0);
        session.setQuestionStartedAt(Instant.now());
        QuizPlayerEntity playerA = player("Ana", "p1", 50, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        AnswerFeedback feedback = quizService.submitAnswer(ROOM, new SubmitAnswerReq("5"), "p1");

        assertFalse(feedback.isCorrect());
        assertEquals(0, feedback.pointsGained());
        assertEquals(50, feedback.totalScore());
    }

    @Test
    void submitAnswer_withoutQuestionStartedStillAwardsMaxPoints() {
        session = session(QuizState.QUESTION, 0);
        session.setQuestionStartedAt(null);
        QuizPlayerEntity playerA = player("Ana", "p1", null, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        AnswerFeedback feedback = quizService.submitAnswer(ROOM, new SubmitAnswerReq("4"), "p1");

        assertTrue(feedback.pointsGained() >= GamificationRules.QUIZ_MAX_POINTS - 10);
        assertEquals(feedback.pointsGained(), feedback.totalScore());
    }

    @Test
    void submitAnswer_withoutCachedCardsIsAlwaysWrong() {
        session = session(QuizState.QUESTION, 0);
        session.setQuestionStartedAt(Instant.now());
        QuizPlayerEntity playerA = player("Ana", "p1", 0, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM)).thenReturn(List.of());

        AnswerFeedback feedback = quizService.submitAnswer(ROOM, new SubmitAnswerReq("4"), "p1");

        assertFalse(feedback.isCorrect());
    }

    @Test
    void submitAnswer_whenCardHasNoBackIsWrong() {
        session = session(QuizState.QUESTION, 0);
        session.setQuestionStartedAt(Instant.now());
        QuizPlayerEntity playerA = player("Ana", "p1", 0, null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));
        when(liveStateStore.getCards(ROOM))
                .thenReturn(List.of(new QuizCardView(UUID.randomUUID(), "front", null)));

        assertFalse(quizService.submitAnswer(ROOM, new SubmitAnswerReq("x"), "p1").isCorrect());
    }

    @Test
    void submitAnswer_outsideQuestionStateIsRejected() {
        session = session(QuizState.LOBBY, -1);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));

        SubmitAnswerReq request = new SubmitAnswerReq("4");
        assertThrows(
                ValidationException.class, () -> quizService.submitAnswer(ROOM, request, "p1"));
    }

    @Test
    void submitAnswer_unknownPlayerSessionIsRejected() {
        session = session(QuizState.QUESTION, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "intruder"))
                .thenReturn(Optional.empty());

        SubmitAnswerReq request = new SubmitAnswerReq("4");
        assertThrows(
                NotFoundException.class, () -> quizService.submitAnswer(ROOM, request, "intruder"));
    }

    @Test
    void submitAnswer_doubleSubmissionIsRejected() {
        session = session(QuizState.QUESTION, 0);
        QuizPlayerEntity playerA = player("Ana", "p1", 0, "4");
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findBySessionIdAndSessionKey(session.getId(), "p1"))
                .thenReturn(Optional.of(playerA));

        SubmitAnswerReq request = new SubmitAnswerReq("4");
        assertThrows(
                ValidationException.class, () -> quizService.submitAnswer(ROOM, request, "p1"));
        verify(playerRepository, never()).saveAndFlush(any());
    }

    // ---------------------------------------------------------- nextQuestion

    @Test
    void nextQuestion_advancesToTheFollowingCard() {
        session = session(QuizState.LEADERBOARD, 0);
        QuizPlayerEntity playerA = player("Ana", "p1", 10, "4");
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(host);
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of(playerA));
        when(sessionRepository.saveAndFlush(session)).thenReturn(session);

        QuizStateView state = quizService.nextQuestion(ROOM, "host-key");

        assertEquals(QuizState.QUESTION, state.state());
        assertEquals(1, state.currentQuestionIndex());
        assertEquals(cards.get(1), state.currentCard());
        assertNull(playerA.getCurrentAnswer());
    }

    @Test
    void nextQuestion_afterLastCardFinishesTheQuizAndClearsCache() {
        session = session(QuizState.LEADERBOARD, 1);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(host);
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of());
        when(sessionRepository.saveAndFlush(session)).thenReturn(session);

        QuizStateView state = quizService.nextQuestion(ROOM, "host-key");

        assertEquals(QuizState.FINISHED, state.state());
        assertNotNull(session.getFinishedAt());
        verify(liveStateStore).clear(ROOM);
    }

    @Test
    void nextQuestion_byNonHostIsRejected() {
        User intruder = new User();
        intruder.setId(UUID.randomUUID());
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(intruder);

        assertThrows(ValidationException.class, () -> quizService.nextQuestion(ROOM, "spoofed"));
    }

    @Test
    void nextQuestion_withNullIndexStartsFromTheFirstCard() {
        session = session(QuizState.LOBBY, -1);
        session.setCurrentQuestionIndex(null);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(host);
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of());
        when(sessionRepository.saveAndFlush(session)).thenReturn(session);

        assertEquals(1, quizService.nextQuestion(ROOM, "host-key").currentQuestionIndex());
    }

    // ----------------------------------------------------- allPlayersAnswered

    @Test
    void allPlayersAnswered_movesRoomToLeaderboardWhenEveryoneAnswered() {
        session = session(QuizState.QUESTION, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId()))
                .thenReturn(List.of(player("Ana", "p1", 10, "4"), player("Bo", "p2", 5, "5")));

        assertTrue(quizService.allPlayersAnswered(ROOM));
        assertEquals(QuizState.LEADERBOARD, session.getState());
        verify(sessionRepository).saveAndFlush(session);
    }

    @Test
    void allPlayersAnswered_isFalseWhileSomeoneIsStillThinking() {
        session = session(QuizState.QUESTION, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId()))
                .thenReturn(List.of(player("Ana", "p1", 10, "4"), player("Bo", "p2", 5, null)));

        assertFalse(quizService.allPlayersAnswered(ROOM));
        assertEquals(QuizState.QUESTION, session.getState());
        verify(sessionRepository, never()).saveAndFlush(any());
    }

    @Test
    void allPlayersAnswered_isFalseForEmptyRoom() {
        session = session(QuizState.QUESTION, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of());

        assertFalse(quizService.allPlayersAnswered(ROOM));
    }

    @Test
    void allPlayersAnswered_doesNotChangeStateOutsideQuestionPhase() {
        session = session(QuizState.LEADERBOARD, 0);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId()))
                .thenReturn(List.of(player("Ana", "p1", 10, "4")));

        assertTrue(quizService.allPlayersAnswered(ROOM));
        verify(sessionRepository, never()).saveAndFlush(any());
    }

    // -------------------------------------------------------------- getState

    @Test
    void getState_sortsPlayersByScoreDescending() {
        session = session(QuizState.LEADERBOARD, 0);
        List<QuizPlayerEntity> players =
                new ArrayList<>(
                        List.of(
                                player("Low", "p1", 10, "a"),
                                player("High", "p2", 900, "b"),
                                player("Null", "p3", null, null)));
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(players);
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        QuizStateView state = quizService.getState(ROOM);

        assertEquals("High", state.players().get(0).displayName());
        assertEquals("Low", state.players().get(1).displayName());
        assertEquals(0, state.players().get(2).score());
        assertTrue(state.players().get(0).hasAnswered());
        assertFalse(state.players().get(2).hasAnswered());
    }

    @Test
    void getState_outOfRangeIndexYieldsNoCurrentCard() {
        session = session(QuizState.FINISHED, 99);
        when(sessionRepository.findByRoomCode(ROOM)).thenReturn(Optional.of(session));
        when(playerRepository.findAllBySessionId(session.getId())).thenReturn(List.of());
        when(liveStateStore.getCards(ROOM)).thenReturn(cards);

        assertNull(quizService.getState(ROOM).currentCard());
    }

    @Test
    void getState_unknownRoomThrowsNotFound() {
        when(sessionRepository.findByRoomCode("999999")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> quizService.getState("999999"));
    }

    // ------------------------------------------------------- handleDisconnect

    @Test
    void handleDisconnect_removesThePlayer() {
        QuizPlayerEntity playerA = player("Ana", "p1", 10, null);
        when(playerRepository.findBySessionKey("p1")).thenReturn(Optional.of(playerA));

        quizService.handleDisconnect("p1");

        verify(playerRepository).delete(playerA);
    }

    @Test
    void handleDisconnect_ignoresUnknownSessions() {
        when(playerRepository.findBySessionKey("ghost")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> quizService.handleDisconnect("ghost"));
        verify(playerRepository, never()).delete(any());
    }
}
