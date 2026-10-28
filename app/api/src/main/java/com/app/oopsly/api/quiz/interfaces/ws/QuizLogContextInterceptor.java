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

import com.app.oopsly.api.quiz.domain.QuizChannels;
import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ExecutorChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Binds {@code room} (the six digit code) and {@code user} to the log context while a room message
 * is handled, so every line written for a room, by any class, carries the same room code and can be
 * followed with one grep.
 */
@Component
public class QuizLogContextInterceptor implements ExecutorChannelInterceptor {

    public static final String MDC_ROOM = "room";
    public static final String MDC_USER = "user";

    private static final Pattern ROOM_DESTINATION =
            Pattern.compile("^" + QuizChannels.APP_PREFIX + "/quiz/([^/]+)/");

    @Override
    public Message<?> beforeHandle(
            Message<?> message, MessageChannel channel, MessageHandler handler) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        String destination = accessor.getDestination();
        Matcher room = destination == null ? null : ROOM_DESTINATION.matcher(destination);
        if (room != null && room.find()) {
            MDC.put(MDC_ROOM, room.group(1));
        }
        Principal user = accessor.getUser();
        if (user != null) {
            MDC.put(MDC_USER, user.getName());
        }
        return message;
    }

    @Override
    public void afterMessageHandled(
            Message<?> message, MessageChannel channel, MessageHandler handler, Exception ex) {
        MDC.remove(MDC_ROOM);
        MDC.remove(MDC_USER);
    }
}
