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

package com.app.oopsly.api.quiz.interfaces.ws;

import com.app.oopsly.api.quiz.application.QuizService;
import com.app.oopsly.api.quiz.application.vm.AnswerFeedback;
import com.app.oopsly.api.quiz.application.vm.CreateQuizReq;
import com.app.oopsly.api.quiz.application.vm.JoinQuizReq;
import com.app.oopsly.api.quiz.application.vm.QuizErrorView;
import com.app.oopsly.api.quiz.application.vm.QuizStateView;
import com.app.oopsly.api.quiz.application.vm.SubmitAnswerReq;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * Realtime quiz endpoints over STOMP.
 *
 * <p>Client sends to: {@code /app/quiz/create}, {@code /app/quiz/{roomCode}/join}, {@code
 * /app/quiz/{roomCode}/start}, {@code /app/quiz/{roomCode}/answer}, {@code
 * /app/quiz/{roomCode}/next}. Clients subscribe to {@code /topic/quiz/{roomCode}} for the shared
 * state and to {@code /user/queue/quiz} for private feedback and errors.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class QuizWebSocketController {

    private final QuizService quizService;
    private final SimpMessagingTemplate messagingTemplate;

    /** Creates a room and returns the initial state to the host only. */
    @MessageMapping("/quiz/create")
    @SendToUser(QuizChannels.USER_QUEUE_QUIZ)
    public QuizStateView createRoom(
            @Valid @Payload CreateQuizReq request, SimpMessageHeaderAccessor headerAccessor) {
        QuizStateView state = quizService.createRoom(request, sessionKey(headerAccessor));
        log.info("Quiz room {} created over STOMP", state.roomCode());
        return state;
    }

    /** Joins a lobby and broadcasts the refreshed state to the room. */
    @MessageMapping("/quiz/{roomCode}/join")
    public void join(
            @DestinationVariable String roomCode,
            @Valid @Payload JoinQuizReq request,
            SimpMessageHeaderAccessor headerAccessor) {
        QuizStateView state = quizService.join(roomCode, request, sessionKey(headerAccessor));
        broadcast(roomCode, state);
    }

    /** Starts the quiz. Only the host of the room is allowed to trigger it. */
    @MessageMapping("/quiz/{roomCode}/start")
    public void start(
            @DestinationVariable String roomCode, SimpMessageHeaderAccessor headerAccessor) {
        broadcast(roomCode, quizService.start(roomCode, sessionKey(headerAccessor)));
    }

    /** Submits an answer, sends private feedback and broadcasts when everyone answered. */
    @MessageMapping("/quiz/{roomCode}/answer")
    public void answer(
            @DestinationVariable String roomCode,
            @Valid @Payload SubmitAnswerReq request,
            SimpMessageHeaderAccessor headerAccessor) {
        String sessionKey = sessionKey(headerAccessor);
        AnswerFeedback feedback = quizService.submitAnswer(roomCode, request, sessionKey);
        messagingTemplate.convertAndSendToUser(sessionKey, QuizChannels.USER_QUEUE_QUIZ, feedback);

        if (quizService.allPlayersAnswered(roomCode)) {
            broadcast(roomCode, quizService.getState(roomCode));
        }
    }

    /** Advances to the next question or finishes the quiz. Host only. */
    @MessageMapping("/quiz/{roomCode}/next")
    public void next(
            @DestinationVariable String roomCode, SimpMessageHeaderAccessor headerAccessor) {
        broadcast(roomCode, quizService.nextQuestion(roomCode, sessionKey(headerAccessor)));
    }

    /** Returns any domain error as a friendly message on the private user queue. */
    @MessageExceptionHandler(Exception.class)
    @SendToUser(QuizChannels.USER_QUEUE_QUIZ)
    public QuizErrorView handleException(Exception exception) {
        log.warn("Quiz socket error: {}", exception.getMessage());
        return new QuizErrorView(exception.getMessage());
    }

    private void broadcast(String roomCode, QuizStateView state) {
        messagingTemplate.convertAndSend(QuizChannels.roomTopic(roomCode), state);
    }

    private static String sessionKey(SimpMessageHeaderAccessor headerAccessor) {
        return headerAccessor.getSessionId();
    }
}
