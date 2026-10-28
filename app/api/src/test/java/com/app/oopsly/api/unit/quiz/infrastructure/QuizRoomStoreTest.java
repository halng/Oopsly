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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.quiz.infrastructure.QuizRoomStore;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.fppt.jedismock.RedisServer;
import java.io.IOException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

class QuizRoomStoreTest {

    private RedisServer server;
    private LettuceConnectionFactory factory;
    private StringRedisTemplate redis;
    private QuizRoomStore store;

    @BeforeEach
    void setUp() throws IOException {
        server = RedisServer.newRedisServer().start();
        factory =
                new LettuceConnectionFactory(
                        new RedisStandaloneConfiguration(server.getHost(), server.getBindPort()));
        factory.afterPropertiesSet();
        redis = new StringRedisTemplate(factory);
        redis.afterPropertiesSet();
        store = new QuizRoomStore(redis, new ObjectMapper());
    }

    @AfterEach
    void tearDown() throws IOException {
        factory.destroy();
        server.stop();
    }

    private static RoomState room(String code) {
        RoomState room = new RoomState();
        room.setCode(code);
        room.setTitle("Biology");
        return room;
    }

    @Test
    void createStoresTheRoomAndMarksItActive() {
        store.create(room("111111"));

        assertTrue(store.exists("111111"));
        assertFalse(store.exists("222222"));
        assertEquals("Biology", store.find("111111").orElseThrow().getTitle());
        assertTrue(store.find("222222").isEmpty());
        assertTrue(store.activeCodes().contains("111111"));

        store.deactivate("111111");
        assertTrue(store.activeCodes().isEmpty());
    }

    @Test
    void updatePersistsChangesAndReleasesTheLock() {
        store.create(room("111111"));

        String result =
                store.update(
                        "111111",
                        state -> {
                            state.setState(QuizState.QUESTION);
                            return "done";
                        });

        assertEquals("done", result);
        assertEquals(QuizState.QUESTION, store.find("111111").orElseThrow().getState());
        assertEquals(null, redis.opsForValue().get("quiz:lock:111111"));
        assertThrows(NotFoundException.class, () -> store.update("999999", s -> s));
    }

    @Test
    void updateGivesUpWhenSomeoneElseHoldsTheLock() {
        store.create(room("111111"));
        redis.opsForValue().set("quiz:lock:111111", "other");

        assertThrows(RetryLaterException.class, () -> store.update("111111", s -> s));
        assertEquals("other", redis.opsForValue().get("quiz:lock:111111"));
    }

    @Test
    void sessionBindingIsReadOnce() {
        store.bindSession("s1", "111111", "guest:abc|x");

        assertArrayEquals(
                new String[] {"111111", "guest:abc|x"}, store.unbindSession("s1").orElseThrow());
        assertTrue(store.unbindSession("s1").isEmpty());
    }

    @Test
    void unreadableRoomsFailLoudly() {
        redis.opsForValue().set("quiz:room:333333", "{not json");

        assertThrows(IllegalStateException.class, () -> store.find("333333"));
    }

    @Test
    void publishedEventsReachEveryRelaySubscribedToTheChannel() throws Exception {
        java.util.concurrent.CountDownLatch received = new java.util.concurrent.CountDownLatch(2);
        java.util.List<String> bodies = new java.util.concurrent.CopyOnWriteArrayList<>();
        org.springframework.data.redis.listener.RedisMessageListenerContainer container =
                new org.springframework.data.redis.listener.RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        for (int i = 0; i < 2; i++) {
            container.addMessageListener(
                    (message, pattern) -> {
                        bodies.add(new String(message.getBody()));
                        received.countDown();
                    },
                    new org.springframework.data.redis.listener.ChannelTopic("quiz:events"));
        }
        container.afterPropertiesSet();
        container.start();
        try {
            Thread.sleep(300);
            redis.convertAndSend("quiz:events", "hello");

            assertTrue(received.await(3, java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(java.util.List.of("hello", "hello"), bodies);
        } finally {
            container.destroy();
        }
    }
}
