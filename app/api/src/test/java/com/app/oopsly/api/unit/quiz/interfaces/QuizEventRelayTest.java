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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.config.QuizConfig;
import com.app.oopsly.api.quiz.domain.QuizEvent;
import com.app.oopsly.api.quiz.interfaces.ws.QuizEventRelay;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class QuizEventRelayTest {

    private final SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final QuizEventRelay relay = new QuizEventRelay(template, mapper);
    private final JsonNode body = mapper.createObjectNode().put("type", "x");

    private Message message(String json) {
        Message message = mock(Message.class);
        when(message.getBody()).thenReturn(json.getBytes(StandardCharsets.UTF_8));
        return message;
    }

    @Test
    void roomEventsGoToTheRoomTopic() throws Exception {
        relay.onMessage(message(mapper.writeValueAsString(QuizEvent.room("123456", body))), null);

        verify(template).convertAndSend("/topic/quiz/123456", body);
    }

    @Test
    void userEventsGoToThePlayersPrivateQueue() throws Exception {
        relay.onMessage(message(mapper.writeValueAsString(QuizEvent.user("k1", body))), null);

        verify(template).convertAndSendToUser("k1", "/queue/quiz", body);
    }

    @Test
    void unreadableMessagesAreDropped() {
        relay.onMessage(message("{nope"), null);

        verify(template, never()).convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void configSubscribesTheRelayAndProvidesAClock() {
        RedisMessageListenerContainer container =
                new QuizConfig().quizEventContainer(mock(RedisConnectionFactory.class), relay);

        org.junit.jupiter.api.Assertions.assertNotNull(container);
        org.junit.jupiter.api.Assertions.assertNotNull(new QuizConfig().clock());
    }
}
