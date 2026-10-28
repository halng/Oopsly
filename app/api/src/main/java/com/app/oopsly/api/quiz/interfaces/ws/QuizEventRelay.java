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
import com.app.oopsly.api.quiz.domain.QuizEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Receives every quiz event from Redis and hands it to the websocket clients connected to this
 * instance. A private event for a player connected elsewhere finds no local session and is dropped.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuizEventRelay implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            QuizEvent event =
                    objectMapper.readValue(
                            new String(message.getBody(), StandardCharsets.UTF_8), QuizEvent.class);
            if (event.kind() == QuizEvent.Kind.ROOM) {
                messagingTemplate.convertAndSend(
                        QuizChannels.roomTopic(event.code()), event.body());
            } else {
                messagingTemplate.convertAndSendToUser(
                        event.playerKey(), QuizChannels.USER_QUEUE_QUIZ, event.body());
            }
        } catch (Exception ex) {
            log.warn("Dropping unreadable quiz event: {}", ex.getMessage());
        }
    }
}
