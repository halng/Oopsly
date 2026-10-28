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

import com.app.oopsly.api.shared.security.JwtVerifier;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Names every socket user on CONNECT: the account id from a valid access token, or {@code
 * guest:<uuid>} for players who joined without an account.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuizAuthChannelInterceptor implements ChannelInterceptor {

    static final String GUEST_PREFIX = "guest:";
    static final String GUEST_HEADER = "guest-id";
    private static final String BEARER = "Bearer ";

    private final JwtVerifier jwtVerifier;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String user = identify(accessor);
            log.info(
                    "Quiz socket connected | user={} type={} session={}",
                    user,
                    user.startsWith(GUEST_PREFIX) ? "guest" : "account",
                    accessor.getSessionId());
            accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, List.of()));
        }
        return message;
    }

    private String identify(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization != null && authorization.startsWith(BEARER)) {
            try {
                String userId = jwtVerifier.extractUserId(authorization.substring(BEARER.length()));
                if (userId != null) {
                    return userId;
                }
            } catch (RuntimeException ex) {
                log.warn("Quiz socket refused | invalid access token: {}", ex.getMessage());
                throw new MessagingException("Invalid access token");
            }
            log.warn("Quiz socket refused | access token has no user id");
            throw new MessagingException("Invalid access token");
        }
        String guest = accessor.getFirstNativeHeader(GUEST_HEADER);
        try {
            return GUEST_PREFIX + UUID.fromString(guest);
        } catch (RuntimeException ex) {
            log.warn("Quiz socket refused | no token and no valid guest id");
            throw new MessagingException("Sign in or provide a guest id to connect");
        }
    }
}
