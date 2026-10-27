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

package com.app.oopsly.api.unit.quiz.interfaces;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.quiz.application.QuizService;
import com.app.oopsly.api.quiz.application.vm.AnswerReq;
import com.app.oopsly.api.quiz.application.vm.CreateRoomReq;
import com.app.oopsly.api.quiz.application.vm.JoinRoomReq;
import com.app.oopsly.api.quiz.application.vm.ModeReq;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.domain.QuizMode;
import com.app.oopsly.api.quiz.interfaces.rest.QuizController;
import com.app.oopsly.api.quiz.interfaces.ws.QuizSessionDisconnectListener;
import com.app.oopsly.api.quiz.interfaces.ws.QuizTicker;
import com.app.oopsly.api.quiz.interfaces.ws.QuizWebSocketController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.ValidationException;
import java.security.Principal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

class QuizControllersTest {

    private final QuizService service = mock(QuizService.class);
    private final QuizWebSocketController socket = new QuizWebSocketController(service);
    private final Principal ana = () -> "ana";

    private static SimpMessageHeaderAccessor headers(String sessionId) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId(sessionId);
        return accessor;
    }

    @Test
    void socketCommandsDelegateWithThePrincipalName() {
        socket.join("1", new JoinRoomReq("Ana"), ana, headers("s1"));
        socket.resume("1", ana, headers("s1"));
        socket.start("1", ana);
        AnswerReq answer = new AnswerReq(1, null, null);
        socket.answer("1", answer, ana);
        socket.next("1", ana);
        socket.mode("1", new ModeReq(QuizMode.AUTO), ana);
        socket.end("1", ana);

        verify(service).join("1", "ana", "s1", "Ana");
        verify(service).resume("1", "ana", "s1");
        verify(service).start("1", "ana");
        verify(service).answer("1", "ana", answer);
        verify(service).next("1", "ana");
        verify(service).setMode("1", "ana", QuizMode.AUTO);
        verify(service).end("1", "ana");
    }

    @Test
    void errorsBecomePrivateEvents() {
        QuizUserEvent domain = socket.handleDomainError(new ValidationException("Room is full"));
        QuizUserEvent unexpected = socket.handleUnexpected(new IllegalStateException("boom"));

        assertEquals(QuizUserEvent.error("Room is full"), domain);
        assertEquals("error", unexpected.type());
        assertEquals("Something went wrong, please try again", unexpected.message());
    }

    @Test
    void userEventFactoriesSetTheirType() {
        assertEquals("joined", QuizUserEvent.joined("p").type());
        assertEquals("accepted", QuizUserEvent.accepted().type());
        assertEquals("result", QuizUserEvent.result(null).type());
    }

    @Test
    void restCreateWrapsTheRoom() {
        when(service.createRoom(any())).thenReturn(null);

        ApiRes res =
                new QuizController(service)
                        .create(
                                new CreateRoomReq(
                                        UUID.randomUUID(), UUID.randomUUID(), null, null));

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
    }

    @Test
    void tickerAndDisconnectListenerDelegate() {
        new QuizTicker(service).tick();
        verify(service).tick();

        QuizSessionDisconnectListener listener = new QuizSessionDisconnectListener(service);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setSessionId("s9");
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        listener.onDisconnect(new SessionDisconnectEvent(this, message, "s9", CloseStatus.NORMAL));
        verify(service).disconnect("s9");

        Message<byte[]> anonymous =
                MessageBuilder.createMessage(
                        new byte[0],
                        StompHeaderAccessor.create(StompCommand.DISCONNECT).getMessageHeaders());
        listener.onDisconnect(new SessionDisconnectEvent(this, anonymous, "x", CloseStatus.NORMAL));
    }
}
