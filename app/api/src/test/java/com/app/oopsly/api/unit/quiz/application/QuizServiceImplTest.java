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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.quiz.application.QuizPublisher;
import com.app.oopsly.api.quiz.application.QuizServiceImpl;
import com.app.oopsly.api.quiz.application.QuizViewFactory;
import com.app.oopsly.api.quiz.application.vm.AnswerReq;
import com.app.oopsly.api.quiz.application.vm.CreateRoomReq;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.application.vm.RoomView;
import com.app.oopsly.api.quiz.domain.QuizMode;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.quiz.domain.RoomState.Question;
import com.app.oopsly.api.quiz.infrastructure.QuizRoomStore;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.client.AuthProfile;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.testsuite.application.QuestionMetadataMapper;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;

/** Drives a room through its life with an in-memory stand-in for the Redis store. */
class QuizServiceImplTest {

    private static final String HOST = UUID.randomUUID().toString();
    private static final String ANA = "guest:" + UUID.randomUUID();
    private static final String BEN = UUID.randomUUID().toString();

    private final QuizRoomStore store = mock(QuizRoomStore.class);
    private final QuizPublisher publisher = mock(QuizPublisher.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final AuthClient authClient = mock(AuthClient.class);
    private final ShelfRepository shelfRepository = mock(ShelfRepository.class);
    private final TestSuiteRepository suiteRepository = mock(TestSuiteRepository.class);
    private final QuestionRepository questionRepository = mock(QuestionRepository.class);
    private final MutableClock clock = new MutableClock();

    private QuizServiceImpl service;
    private RoomState room;

    @BeforeEach
    void setUp() {
        room = lobby();
        when(store.update(eq("123456"), any()))
                .thenAnswer(
                        (InvocationOnMock call) ->
                                call.<Function<RoomState, Object>>getArgument(1).apply(room));
        when(store.find("123456")).thenAnswer(call -> Optional.of(room));
        when(store.activeCodes()).thenReturn(Set.of("123456"));
        service =
                new QuizServiceImpl(
                        store,
                        publisher,
                        new QuizViewFactory(clock),
                        currentUser,
                        authClient,
                        shelfRepository,
                        suiteRepository,
                        questionRepository,
                        new QuestionMetadataMapper(new ObjectMapper()),
                        clock);
    }

    @Test
    void createRoom_capsPlayersByPlanAndLoadsQuestions() {
        UUID hostId = UUID.fromString(HOST);
        Shelf shelf = new Shelf();
        TestSuiteEntity suite = TestSuiteEntity.builder().title("Biology").build();
        QuestionEntity single =
                question(
                        QuestionType.SINGLE_CHOICE,
                        "{\"options\":[\"a\",\"b\"],\"correctOptionIndex\":1}");
        QuestionEntity matching = question(QuestionType.MATCHING, "{}");
        when(currentUser.id()).thenReturn(hostId);
        when(currentUser.plan()).thenReturn("PRO");
        when(shelfRepository.findByIdAndUserId(any(), eq(hostId))).thenReturn(Optional.of(shelf));
        when(suiteRepository.findByIdAndShelve(any(), eq(shelf))).thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of(single, matching));
        when(authClient.lookup(hostId))
                .thenReturn(new AuthProfile(hostId, "Host", "Host", null, 20));

        RoomView view =
                service.createRoom(
                        new CreateRoomReq(UUID.randomUUID(), UUID.randomUUID(), null, null));

        assertEquals(50, view.maxPlayers());
        assertEquals(1, view.totalQuestions());
        assertEquals(QuizMode.MANUAL, view.mode());
        assertEquals(20, view.questionSeconds());
        assertEquals(QuizState.LOBBY, view.state());
        verify(store).create(any(RoomState.class));
    }

    @Test
    void createRoom_rejectsSuitesWithoutHostableQuestions() {
        UUID hostId = UUID.fromString(HOST);
        Shelf shelf = new Shelf();
        TestSuiteEntity suite = TestSuiteEntity.builder().title("Empty").build();
        when(currentUser.id()).thenReturn(hostId);
        when(shelfRepository.findByIdAndUserId(any(), eq(hostId))).thenReturn(Optional.of(shelf));
        when(suiteRepository.findByIdAndShelve(any(), eq(shelf))).thenReturn(Optional.of(suite));
        when(questionRepository.findAllByTestSuite(suite)).thenReturn(List.of());

        CreateRoomReq request = new CreateRoomReq(UUID.randomUUID(), UUID.randomUUID(), null, 30);
        assertThrows(ValidationException.class, () -> service.createRoom(request));
    }

    @Test
    void createRoom_requiresOwnedShelfAndSuite() {
        when(currentUser.id()).thenReturn(UUID.fromString(HOST));
        when(shelfRepository.findByIdAndUserId(any(), any())).thenReturn(Optional.empty());
        CreateRoomReq request = new CreateRoomReq(UUID.randomUUID(), UUID.randomUUID(), null, 30);
        assertThrows(NotFoundException.class, () -> service.createRoom(request));
    }

    @Test
    void join_addsPlayerAndRejectsDuplicatesFullRoomsAndLateJoiners() {
        service.join("123456", ANA, "s1", " Ana ");
        assertEquals("Ana", room.getPlayers().get(ANA).getName());
        assertTrue(room.getPlayers().get(ANA).isGuest());
        verify(store).bindSession("s1", "123456", ANA);
        verify(publisher).publish(room);

        assertThrows(ValidationException.class, () -> service.join("123456", BEN, "s2", "ana"));

        room.setMaxPlayers(1);
        assertThrows(ValidationException.class, () -> service.join("123456", BEN, "s2", "Ben"));

        room.setMaxPlayers(20);
        service.join("123456", BEN, "s2", "Ben");
        service.start("123456", HOST);
        assertThrows(ValidationException.class, () -> service.join("123456", "x", "s3", "Late"));
    }

    @Test
    void join_sameKeyReattachesAfterStart() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);
        room.getPlayers().get(ANA).setConnected(false);

        service.join("123456", ANA, "s9", "Ana");

        assertTrue(room.getPlayers().get(ANA).isConnected());
    }

    @Test
    void start_isHostOnlyAndNeedsPlayers() {
        assertThrows(ValidationException.class, () -> service.start("123456", HOST));
        service.join("123456", ANA, "s1", "Ana");
        assertThrows(ValidationException.class, () -> service.start("123456", ANA));

        service.start("123456", HOST);

        assertEquals(QuizState.QUESTION, room.getState());
        assertEquals(0, room.getCurrentIndex());
        assertEquals(clock.millis() + 20_000, room.getDeadline());
        assertThrows(ValidationException.class, () -> service.start("123456", HOST));
    }

    @Test
    void answer_scoresBySpeedAndRevealsWhenEveryoneAnswered() {
        service.join("123456", ANA, "s1", "Ana");
        service.join("123456", BEN, "s2", "Ben");
        service.start("123456", HOST);

        clock.advance(10_000);
        service.answer("123456", ANA, new AnswerReq(1, null, null));
        assertEquals(QuizState.QUESTION, room.getState());
        assertEquals(750, room.getPlayers().get(ANA).getScore());
        verify(publisher).sendTo(ANA, QuizUserEvent.accepted());

        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(1, null, null)));

        service.answer("123456", BEN, new AnswerReq(0, null, null));

        assertEquals(QuizState.REVEAL, room.getState());
        assertEquals(0, room.getPlayers().get(BEN).getScore());
        assertEquals(0, room.getPlayers().get(BEN).getStreak());
        assertEquals(0, room.getDeadline());
    }

    @Test
    void answer_gradesMultipleChoiceAndFillInTheBlank() {
        service.join("123456", ANA, "s1", "Ana");
        room.getQuestions().clear();
        room.getQuestions().add(multi());
        room.getQuestions().add(blank());
        service.start("123456", HOST);

        service.answer("123456", ANA, new AnswerReq(null, List.of(2, 0), null));
        assertEquals(1, room.getPlayers().get(ANA).getStreak());

        service.next("123456", HOST);
        service.answer("123456", ANA, new AnswerReq(null, null, "  PARIS "));
        assertTrue(room.getPlayers().get(ANA).getAnswers().get(1).isCorrect());
    }

    @Test
    void answer_rejectsInvalidInputAndLateAnswers() {
        service.join("123456", ANA, "s1", "Ana");
        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(0, null, null)));
        service.start("123456", HOST);

        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(9, null, null)));
        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(null, null, null)));
        assertThrows(
                NotFoundException.class,
                () -> service.answer("123456", BEN, new AnswerReq(0, null, null)));

        clock.advance(25_000);
        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(1, null, null)));
    }

    @Test
    void answer_validatesMultiAndTextPayloads() {
        service.join("123456", ANA, "s1", "Ana");
        room.getQuestions().clear();
        room.getQuestions().add(multi());
        room.getQuestions().add(blank());
        service.start("123456", HOST);

        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(null, List.of(), null)));
        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(null, List.of(7), null)));
        service.answer("123456", ANA, new AnswerReq(null, List.of(0), null));
        service.next("123456", HOST);
        assertThrows(
                ValidationException.class,
                () -> service.answer("123456", ANA, new AnswerReq(null, null, " ")));
    }

    @Test
    void next_closesQuestionThenAdvancesAndFinishes() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);

        service.next("123456", HOST);
        assertEquals(QuizState.REVEAL, room.getState());
        service.next("123456", HOST);
        assertEquals(QuizState.QUESTION, room.getState());
        assertEquals(1, room.getCurrentIndex());
        service.next("123456", HOST);
        service.next("123456", HOST);

        assertEquals(QuizState.FINISHED, room.getState());
        assertThrows(ValidationException.class, () -> service.next("123456", HOST));
        assertThrows(ValidationException.class, () -> service.next("123456", ANA));
    }

    @Test
    void setMode_autoSchedulesRevealAndManualClearsIt() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);
        service.next("123456", HOST);

        service.setMode("123456", HOST, QuizMode.AUTO);
        assertEquals(clock.millis() + 8_000, room.getDeadline());
        service.setMode("123456", HOST, QuizMode.MANUAL);
        assertEquals(0, room.getDeadline());
        assertThrows(
                ValidationException.class, () -> service.setMode("123456", ANA, QuizMode.AUTO));
    }

    @Test
    void end_finishesEarlyAndDeactivates() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);

        service.end("123456", HOST);

        assertEquals(QuizState.FINISHED, room.getState());
        verify(store).deactivate("123456");
    }

    @Test
    void tick_closesQuestionAndAutoAdvances() {
        room.setMode(QuizMode.AUTO);
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);

        service.tick();
        assertEquals(QuizState.QUESTION, room.getState());

        clock.advance(20_001);
        service.tick();
        assertEquals(QuizState.REVEAL, room.getState());
        assertEquals(clock.millis() + 8_000, room.getDeadline());

        clock.advance(8_001);
        service.tick();
        assertEquals(1, room.getCurrentIndex());
        assertEquals(QuizState.QUESTION, room.getState());

        clock.advance(20_001);
        service.tick();
        clock.advance(8_001);
        service.tick();
        assertEquals(QuizState.FINISHED, room.getState());
        verify(store).deactivate("123456");
    }

    @Test
    void tick_manualRoomWaitsForHostAtReveal() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);
        clock.advance(20_001);
        service.tick();
        clock.advance(600_000);
        service.tick();

        assertEquals(QuizState.REVEAL, room.getState());
    }

    @Test
    void tick_dropsMissingAndFinishedRooms() {
        when(store.find("123456")).thenReturn(Optional.empty());
        service.tick();
        verify(store).deactivate("123456");

        room.setState(QuizState.FINISHED);
        when(store.find("123456")).thenReturn(Optional.of(room));
        service.tick();
        verify(publisher, never()).publish(any());
    }

    @Test
    void tick_survivesFailingRooms() {
        service.join("123456", ANA, "s1", "Ana");
        service.start("123456", HOST);
        clock.advance(30_000);
        when(store.find("123456")).thenThrow(new IllegalStateException("redis down"));

        service.tick();

        assertEquals(QuizState.QUESTION, room.getState());
    }

    @Test
    void resume_reattachesPlayersAndHostButNotStrangers() {
        service.join("123456", ANA, "s1", "Ana");
        room.getPlayers().get(ANA).setConnected(false);

        service.resume("123456", ANA, "s5");
        assertTrue(room.getPlayers().get(ANA).isConnected());

        service.resume("123456", HOST, "s6");
        verify(store).bindSession("s6", "123456", HOST);
        assertThrows(NotFoundException.class, () -> service.resume("123456", BEN, "s7"));
    }

    @Test
    void disconnect_removesLobbyPlayersAndMarksInGamePlayersOffline() {
        service.join("123456", ANA, "s1", "Ana");
        service.join("123456", BEN, "s2", "Ben");
        when(store.unbindSession("s1")).thenReturn(Optional.of(new String[] {"123456", ANA}));

        service.disconnect("s1");
        assertEquals(1, room.getPlayers().size());

        service.start("123456", HOST);
        when(store.unbindSession("s2")).thenReturn(Optional.of(new String[] {"123456", BEN}));
        service.disconnect("s2");

        assertEquals(false, room.getPlayers().get(BEN).isConnected());
    }

    @Test
    void disconnect_closesQuestionWhenTheLastWaitingPlayerLeaves() {
        service.join("123456", ANA, "s1", "Ana");
        service.join("123456", BEN, "s2", "Ben");
        service.start("123456", HOST);
        service.answer("123456", ANA, new AnswerReq(1, null, null));
        when(store.unbindSession("s2")).thenReturn(Optional.of(new String[] {"123456", BEN}));

        service.disconnect("s2");

        assertEquals(QuizState.REVEAL, room.getState());
    }

    @Test
    void disconnect_ignoresUnknownSessionsPlayersAndMissingRooms() {
        when(store.unbindSession("none")).thenReturn(Optional.empty());
        service.disconnect("none");

        when(store.unbindSession("s1")).thenReturn(Optional.of(new String[] {"123456", BEN}));
        service.disconnect("s1");

        when(store.unbindSession("s3")).thenReturn(Optional.of(new String[] {"999999", BEN}));
        when(store.update(eq("999999"), any())).thenThrow(new NotFoundException("gone"));
        service.disconnect("s3");

        verify(publisher, never()).publish(null);
    }

    // ---------------------------------------------------------------- fixtures

    private RoomState lobby() {
        RoomState state = new RoomState();
        state.setCode("123456");
        state.setHostId(HOST);
        state.setHostName("Host");
        state.setTitle("Biology");
        state.setMaxPlayers(20);
        state.setQuestionSeconds(20);
        state.getQuestions().add(single());
        state.getQuestions().add(single());
        return state;
    }

    private static Question single() {
        Question question = new Question();
        question.setId("q");
        question.setText("Pick b");
        question.setType("SINGLE_CHOICE");
        question.setOptions(List.of("a", "b"));
        question.setCorrectIndex(1);
        return question;
    }

    private static Question multi() {
        Question question = new Question();
        question.setId("m");
        question.setText("Pick a and c");
        question.setType("MULTIPLE_CHOICE");
        question.setOptions(List.of("a", "b", "c"));
        question.setCorrectIndexes(List.of(0, 2));
        return question;
    }

    private static Question blank() {
        Question question = new Question();
        question.setId("b");
        question.setText("Capital of France is ___");
        question.setType("FILL_IN_THE_BLANK");
        question.setAcceptedAnswers(List.of("Paris"));
        return question;
    }

    private static QuestionEntity question(QuestionType type, String metadata) {
        QuestionEntity entity =
                QuestionEntity.builder().text("Q").type(type).metadata(metadata).build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    /** Clock the tests move by hand. */
    private static final class MutableClock extends Clock {
        private long now = 1_000_000L;

        void advance(long millis) {
            now += millis;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(now);
        }

        @Override
        public long millis() {
            return now;
        }
    }
}
