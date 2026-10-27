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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.quiz.interfaces.ws.QuizAuthChannelInterceptor;
import com.app.oopsly.api.shared.security.JwtVerifier;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class QuizAuthChannelInterceptorTest {

    private final JwtVerifier verifier = mock(JwtVerifier.class);
    private final MessageChannel channel = mock(MessageChannel.class);
    private final QuizAuthChannelInterceptor interceptor = new QuizAuthChannelInterceptor(verifier);

    @Test
    void connect_withValidTokenUsesTheUserId() {
        when(verifier.extractUserId("good")).thenReturn("user-1");

        Message<?> sent = interceptor.preSend(connect("Authorization", "Bearer good"), channel);

        assertEquals("user-1", StompHeaderAccessor.wrap(sent).getUser().getName());
    }

    @Test
    void connect_withGuestIdUsesAGuestName() {
        UUID id = UUID.randomUUID();

        Message<?> sent = interceptor.preSend(connect("guest-id", id.toString()), channel);

        assertEquals("guest:" + id, StompHeaderAccessor.wrap(sent).getUser().getName());
    }

    @Test
    void connect_rejectsBadTokensAndMissingIdentity() {
        when(verifier.extractUserId("bad")).thenThrow(new IllegalArgumentException("bad"));
        when(verifier.extractUserId("empty")).thenReturn(null);

        Message<?> badToken = connect("Authorization", "Bearer bad");
        Message<?> noId = connect("Authorization", "Bearer empty");
        Message<?> nothing = connect("x", "y");
        Message<?> badGuest = connect("guest-id", "not-a-uuid");

        assertThrows(MessagingException.class, () -> interceptor.preSend(badToken, channel));
        assertThrows(MessagingException.class, () -> interceptor.preSend(noId, channel));
        assertThrows(MessagingException.class, () -> interceptor.preSend(nothing, channel));
        assertThrows(MessagingException.class, () -> interceptor.preSend(badGuest, channel));
    }

    @Test
    void otherFramesPassThroughUntouched() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertEquals(message, interceptor.preSend(message, channel));
        Message<String> plain = MessageBuilder.withPayload("x").build();
        assertEquals(plain, interceptor.preSend(plain, channel));
    }

    private static Message<byte[]> connect(String header, String value) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader(header, value);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
