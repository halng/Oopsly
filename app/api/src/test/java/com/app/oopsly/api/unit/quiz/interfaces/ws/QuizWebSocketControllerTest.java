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

package com.app.oopsly.api.unit.quiz.interfaces.ws;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.quiz.application.QuizService;
import com.app.oopsly.api.quiz.application.vm.*;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.interfaces.ws.QuizSessionDisconnectListener;
import com.app.oopsly.api.quiz.interfaces.ws.QuizWebSocketController;
import com.app.oopsly.api.shared.exception.ValidationException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@ExtendWith(MockitoExtension.class)
class QuizWebSocketControllerTest {

    private static final String ROOM = "123456";
    private static final String SESSION_KEY = "sess-1";

    @Mock private QuizService quizService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private QuizWebSocketController controller;

    private SimpMessageHeaderAccessor headerAccessor;
    private QuizStateView state;

    @BeforeEach
    void setUp() {
        headerAccessor = SimpMessageHeaderAccessor.create();
        headerAccessor.setSessionId(SESSION_KEY);
        state =
                new QuizStateView(
                        ROOM,
                        UUID.randomUUID(),
                        "Host",
                        UUID.randomUUID(),
                        "Maths",
                        QuizState.LOBBY,
                        -1,
                        0,
                        null,
                        List.of());
    }

    @Test
    void createRoom_returnsStateToTheHostOnly() {
        CreateQuizReq request = new CreateQuizReq(UUID.randomUUID(), "Maths", List.of());
        when(quizService.createRoom(request, SESSION_KEY)).thenReturn(state);

        assertSame(state, controller.createRoom(request, headerAccessor));
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void join_broadcastsRefreshedStateToTheRoom() {
        JoinQuizReq request = new JoinQuizReq("Ana");
        when(quizService.join(ROOM, request, SESSION_KEY)).thenReturn(state);

        controller.join(ROOM, request, headerAccessor);

        verify(messagingTemplate).convertAndSend(QuizChannels.roomTopic(ROOM), state);
    }

    @Test
    void start_broadcastsTheStartedState() {
        when(quizService.start(ROOM, SESSION_KEY)).thenReturn(state);

        controller.start(ROOM, headerAccessor);

        verify(messagingTemplate).convertAndSend(QuizChannels.roomTopic(ROOM), state);
    }

    @Test
    void start_propagatesHostOnlyViolations() {
        when(quizService.start(ROOM, SESSION_KEY)).thenThrow(new ValidationException("not host"));

        assertThrows(ValidationException.class, () -> controller.start(ROOM, headerAccessor));
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void answer_sendsPrivateFeedbackAndWaitsForTheOthers() {
        SubmitAnswerReq request = new SubmitAnswerReq("4");
        AnswerFeedback feedback = new AnswerFeedback(true, 900, 900);
        when(quizService.submitAnswer(ROOM, request, SESSION_KEY)).thenReturn(feedback);
        when(quizService.allPlayersAnswered(ROOM)).thenReturn(false);

        controller.answer(ROOM, request, headerAccessor);

        verify(messagingTemplate)
                .convertAndSendToUser(SESSION_KEY, QuizChannels.USER_QUEUE_QUIZ, feedback);
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void answer_broadcastsWhenEveryonePlayed() {
        SubmitAnswerReq request = new SubmitAnswerReq("4");
        AnswerFeedback feedback = new AnswerFeedback(false, 0, 10);
        when(quizService.submitAnswer(ROOM, request, SESSION_KEY)).thenReturn(feedback);
        when(quizService.allPlayersAnswered(ROOM)).thenReturn(true);
        when(quizService.getState(ROOM)).thenReturn(state);

        controller.answer(ROOM, request, headerAccessor);

        verify(messagingTemplate)
                .convertAndSendToUser(SESSION_KEY, QuizChannels.USER_QUEUE_QUIZ, feedback);
        verify(messagingTemplate).convertAndSend(QuizChannels.roomTopic(ROOM), state);
    }

    @Test
    void next_broadcastsTheAdvancedState() {
        when(quizService.nextQuestion(ROOM, SESSION_KEY)).thenReturn(state);

        controller.next(ROOM, headerAccessor);

        verify(messagingTemplate).convertAndSend(QuizChannels.roomTopic(ROOM), state);
    }

    @Test
    void handleException_returnsFriendlyErrorPayload() {
        QuizErrorView error = controller.handleException(new ValidationException("Room is full"));

        assertEquals("Room is full", error.message());
    }

    @Test
    void handleException_toleratesMessagelessExceptions() {
        assertNull(controller.handleException(new RuntimeException()).message());
    }

    @Test
    void sessionKey_isNullWhenTheHeaderIsMissing() {
        SimpMessageHeaderAccessor anonymous = SimpMessageHeaderAccessor.create();
        CreateQuizReq request = new CreateQuizReq(UUID.randomUUID(), null, List.of());
        when(quizService.createRoom(request, null)).thenReturn(state);

        assertSame(state, controller.createRoom(request, anonymous));
    }

    // ------------------------------------------------------------- listener

    @Test
    void disconnectListener_cleansUpThePlayer() {
        QuizSessionDisconnectListener listener = new QuizSessionDisconnectListener(quizService);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setSessionId(SESSION_KEY);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        listener.onDisconnect(new SessionDisconnectEvent(this, message, SESSION_KEY, null));

        verify(quizService).handleDisconnect(SESSION_KEY);
    }

    @Test
    void disconnectListener_ignoresEventsWithoutSessionId() {
        QuizSessionDisconnectListener listener = new QuizSessionDisconnectListener(quizService);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        listener.onDisconnect(new SessionDisconnectEvent(this, message, "ignored", null));

        verify(quizService, never()).handleDisconnect(anyString());
    }
}
