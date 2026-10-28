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

package com.app.oopsly.api.quiz.application;

import com.app.oopsly.api.quiz.application.vm.PlayerResult;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.quiz.domain.QuizEvent;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes room state and per player outcomes to a Redis channel. Every API instance relays them
 * to its own websocket clients, so players and host can be connected to different instances.
 */
@Component
@RequiredArgsConstructor
public class QuizPublisher {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final QuizViewFactory viewFactory;

    /** Broadcasts the room and, once a question closed, each player's own result. */
    public void publish(RoomState room) {
        send(QuizEvent.room(room.getCode(), objectMapper.valueToTree(viewFactory.roomView(room))));
        if (room.getState() == QuizState.REVEAL || room.getState() == QuizState.FINISHED) {
            for (Map.Entry<String, PlayerResult> entry : viewFactory.results(room).entrySet()) {
                sendTo(entry.getKey(), QuizUserEvent.result(entry.getValue()));
            }
        }
    }

    public void sendTo(String playerKey, QuizUserEvent event) {
        send(QuizEvent.user(playerKey, objectMapper.valueToTree(event)));
    }

    private void send(QuizEvent event) {
        try {
            redis.convertAndSend(
                    QuizChannels.REDIS_CHANNEL, objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to publish quiz event", ex);
        }
    }
}
