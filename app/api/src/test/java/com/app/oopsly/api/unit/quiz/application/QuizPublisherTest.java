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

package com.app.oopsly.api.unit.quiz.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.quiz.application.QuizPublisher;
import com.app.oopsly.api.quiz.application.QuizViewFactory;
import com.app.oopsly.api.quiz.application.vm.PlayerResult;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.domain.QuizEvent;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;

class QuizPublisherTest {

    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final QuizViewFactory factory = mock(QuizViewFactory.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final QuizPublisher publisher = new QuizPublisher(redis, mapper, factory);

    @Test
    void publishSendsTheRoomAndResultsOnlyAfterAQuestionClosed() throws Exception {
        RoomState room = new RoomState();
        room.setCode("123456");
        PlayerResult result = new PlayerResult(true, true, 500, 500, 1, 1);
        when(factory.results(room)).thenReturn(Map.of("k1", result));

        publisher.publish(room);
        verify(redis, times(1)).convertAndSend(eq("quiz:events"), any(String.class));

        room.setState(QuizState.REVEAL);
        publisher.publish(room);

        ArgumentCaptor<String> sent = ArgumentCaptor.forClass(String.class);
        verify(redis, times(3)).convertAndSend(eq("quiz:events"), sent.capture());
        QuizEvent roomEvent = mapper.readValue(sent.getAllValues().get(1), QuizEvent.class);
        QuizEvent userEvent = mapper.readValue(sent.getAllValues().get(2), QuizEvent.class);
        assertEquals(QuizEvent.Kind.ROOM, roomEvent.kind());
        assertEquals("123456", roomEvent.code());
        assertEquals(QuizEvent.Kind.USER, userEvent.kind());
        assertEquals("k1", userEvent.playerKey());
        assertEquals("result", userEvent.body().get("type").asText());
    }

    @Test
    void sendToPublishesAPrivateEvent() throws Exception {
        publisher.sendTo("k1", QuizUserEvent.accepted());

        ArgumentCaptor<String> sent = ArgumentCaptor.forClass(String.class);
        verify(redis).convertAndSend(eq("quiz:events"), sent.capture());
        QuizEvent event = mapper.readValue(sent.getValue(), QuizEvent.class);
        assertEquals("accepted", event.body().get("type").asText());
        verify(factory, never()).results(any());
    }

    @Test
    void unserialisableEventsFailLoudly() throws Exception {
        ObjectMapper broken = mock(ObjectMapper.class);
        when(broken.valueToTree(any())).thenReturn(mapper.createObjectNode());
        when(broken.writeValueAsString(any()))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("x") {});
        QuizPublisher failing = new QuizPublisher(redis, broken, factory);

        assertThrows(
                IllegalStateException.class, () -> failing.sendTo("k1", QuizUserEvent.accepted()));
    }
}
