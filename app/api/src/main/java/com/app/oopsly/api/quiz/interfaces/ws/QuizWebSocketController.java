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
import com.app.oopsly.api.quiz.application.vm.AnswerReq;
import com.app.oopsly.api.quiz.application.vm.JoinRoomReq;
import com.app.oopsly.api.quiz.application.vm.ModeReq;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.ValidationException;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * Realtime room endpoints over STOMP. Clients send to {@code /app/quiz/{code}/...} and listen on
 * {@code /topic/quiz/{code}} (shared state) and {@code /user/queue/quiz} (private events).
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class QuizWebSocketController {

    private final QuizService quizService;

    @MessageMapping("/quiz/{code}/join")
    public void join(
            @DestinationVariable String code,
            @Valid @Payload JoinRoomReq request,
            Principal principal,
            SimpMessageHeaderAccessor headers) {
        quizService.join(code, principal.getName(), headers.getSessionId(), request.name());
    }

    @MessageMapping("/quiz/{code}/resume")
    public void resume(
            @DestinationVariable String code,
            Principal principal,
            SimpMessageHeaderAccessor headers) {
        quizService.resume(code, principal.getName(), headers.getSessionId());
    }

    @MessageMapping("/quiz/{code}/start")
    public void start(@DestinationVariable String code, Principal principal) {
        quizService.start(code, principal.getName());
    }

    @MessageMapping("/quiz/{code}/answer")
    public void answer(
            @DestinationVariable String code,
            @Valid @Payload AnswerReq request,
            Principal principal) {
        quizService.answer(code, principal.getName(), request);
    }

    @MessageMapping("/quiz/{code}/next")
    public void next(@DestinationVariable String code, Principal principal) {
        quizService.next(code, principal.getName());
    }

    @MessageMapping("/quiz/{code}/mode")
    public void mode(
            @DestinationVariable String code,
            @Valid @Payload ModeReq request,
            Principal principal) {
        quizService.setMode(code, principal.getName(), request.mode());
    }

    @MessageMapping("/quiz/{code}/end")
    public void end(@DestinationVariable String code, Principal principal) {
        quizService.end(code, principal.getName());
    }

    /** Domain problems reach the caller as a readable error on the private queue. */
    @MessageExceptionHandler({
        ValidationException.class,
        NotFoundException.class,
        RetryLaterException.class
    })
    @SendToUser(QuizChannels.USER_QUEUE_QUIZ)
    public QuizUserEvent handleDomainError(RuntimeException exception) {
        log.warn("Quiz request rejected: {}", exception.getMessage());
        return QuizUserEvent.error(exception.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(QuizChannels.USER_QUEUE_QUIZ)
    public QuizUserEvent handleUnexpected(Exception exception) {
        log.warn("Quiz socket error", exception);
        return QuizUserEvent.error("Something went wrong, please try again");
    }
}
