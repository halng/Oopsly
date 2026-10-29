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
import static org.junit.jupiter.api.Assertions.assertNull;

import com.app.oopsly.api.quiz.interfaces.ws.QuizLogContextInterceptor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class QuizLogContextInterceptorTest {
    private final QuizLogContextInterceptor interceptor = new QuizLogContextInterceptor();

    @AfterEach
    void clear() {
        MDC.clear();
    }

    private static Message<byte[]> send(String destination, String user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination(destination);
        if (user != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(user, null));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void givenRoomMessage_whenHandled_thenUserIsBoundThenCleared() {
        interceptor.beforeHandle(send("/app/quiz/611564/join", "guest:abc"), null, null);

        assertNull(MDC.get("room"));
        assertEquals("guest:abc", MDC.get(QuizLogContextInterceptor.MDC_USER));

        interceptor.afterMessageHandled(null, null, null, null);

        assertNull(MDC.get(QuizLogContextInterceptor.MDC_USER));
    }

    @Test
    void givenNoUser_whenHandled_thenNothingIsBound() {
        interceptor.beforeHandle(send("/app/other", null), null, null);

        assertNull(MDC.get(QuizLogContextInterceptor.MDC_USER));
    }

    @Test
    void givenMessageWithoutStompHeaders_whenHandled_thenIgnored() {
        Message<String> plain = MessageBuilder.withPayload("x").build();

        interceptor.beforeHandle(plain, null, null);

        assertNull(MDC.get(QuizLogContextInterceptor.MDC_USER));
    }
}
