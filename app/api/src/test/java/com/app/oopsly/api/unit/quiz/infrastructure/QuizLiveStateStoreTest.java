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

package com.app.oopsly.api.unit.quiz.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.quiz.application.vm.QuizCardView;
import com.app.oopsly.api.quiz.infrastructure.QuizLiveStateStore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class QuizLiveStateStoreTest {

    private static final String ROOM = "123456";
    private static final String KEY = "quiz_cards:123456";

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private QuizLiveStateStore store;
    private List<QuizCardView> cards;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        store = new QuizLiveStateStore(redisTemplate, objectMapper);
        cards = List.of(new QuizCardView(UUID.randomUUID(), "front", "back"));
    }

    @Test
    void saveCards_storesSerializedDeckWithTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        store.saveCards(ROOM, cards);

        verify(valueOperations).set(eq(KEY), anyString(), eq(Duration.ofHours(6)));
    }

    @Test
    void saveCards_swallowsRedisOutages() {
        when(redisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));

        assertDoesNotThrow(() -> store.saveCards(ROOM, cards));
    }

    @Test
    void saveCards_swallowsSerializationErrors() throws JsonProcessingException {
        ObjectMapper failing = mock(ObjectMapper.class);
        when(failing.writeValueAsString(any())).thenThrow(new RuntimeException("boom"));
        QuizLiveStateStore failingStore = new QuizLiveStateStore(redisTemplate, failing);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        assertDoesNotThrow(() -> failingStore.saveCards(ROOM, cards));
        verifyNoInteractions(valueOperations);
    }

    @Test
    void getCards_returnsDeserializedDeck() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(KEY)).thenReturn(objectMapper.writeValueAsString(cards));

        assertEquals(cards, store.getCards(ROOM));
    }

    @Test
    void getCards_returnsEmptyListWhenNothingCached() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(KEY)).thenReturn(null);

        assertTrue(store.getCards(ROOM).isEmpty());
    }

    @Test
    void getCards_returnsEmptyListOnCorruptedPayload() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(KEY)).thenReturn("{ not json");

        assertTrue(store.getCards(ROOM).isEmpty());
    }

    @Test
    void getCards_returnsEmptyListOnRedisOutage() {
        when(redisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));

        assertTrue(store.getCards(ROOM).isEmpty());
    }

    @Test
    void clear_deletesTheRoomKey() {
        store.clear(ROOM);

        verify(redisTemplate).delete(KEY);
    }
}
