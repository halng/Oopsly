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

package com.app.oopsly.api.quiz.infrastructure;

import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/** Redis home of live rooms: one JSON document per room guarded by a short lived lock. */
@Component
@RequiredArgsConstructor
public class QuizRoomStore {

    static final String ROOM_PREFIX = "quiz:room:";
    static final String LOCK_PREFIX = "quiz:lock:";
    static final String SESSION_PREFIX = "quiz:session:";
    static final String ACTIVE_KEY = "quiz:active";
    static final Duration ROOM_TTL = Duration.ofHours(6);
    static final Duration LOCK_TTL = Duration.ofSeconds(5);
    static final int LOCK_ATTEMPTS = 50;
    static final long LOCK_WAIT_MILLIS = 40;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public boolean exists(String code) {
        return Boolean.TRUE.equals(redis.hasKey(ROOM_PREFIX + code));
    }

    /** Stores a brand new room and registers it with the ticker. */
    public void create(RoomState room) {
        write(room);
        redis.opsForSet().add(ACTIVE_KEY, room.getCode());
    }

    public Optional<RoomState> find(String code) {
        String raw = redis.opsForValue().get(ROOM_PREFIX + code);
        if (raw == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(raw, RoomState.class));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unreadable quiz room " + code, ex);
        }
    }

    /** Runs {@code action} on the room while holding its lock and saves whatever it changed. */
    public <T> T update(String code, Function<RoomState, T> action) {
        String token = UUID.randomUUID().toString();
        acquire(code, token);
        try {
            RoomState room =
                    find(code)
                            .orElseThrow(
                                    () -> new NotFoundException(ApiMessages.QUIZ_ROOM_NOT_FOUND));
            T result = action.apply(room);
            write(room);
            return result;
        } finally {
            release(code, token);
        }
    }

    public Set<String> activeCodes() {
        Set<String> codes = redis.opsForSet().members(ACTIVE_KEY);
        return codes == null ? Set.of() : codes;
    }

    public void deactivate(String code) {
        redis.opsForSet().remove(ACTIVE_KEY, code);
    }

    /** Remembers which room and player a websocket session belongs to. */
    public void bindSession(String sessionId, String code, String playerKey) {
        redis.opsForValue().set(SESSION_PREFIX + sessionId, code + "|" + playerKey, ROOM_TTL);
    }

    /** Returns {@code [code, playerKey]} of a websocket session, removing the binding. */
    public Optional<String[]> unbindSession(String sessionId) {
        String raw = redis.opsForValue().getAndDelete(SESSION_PREFIX + sessionId);
        if (raw == null) {
            return Optional.empty();
        }
        int split = raw.indexOf('|');
        return Optional.of(new String[] {raw.substring(0, split), raw.substring(split + 1)});
    }

    private void write(RoomState room) {
        try {
            redis.opsForValue()
                    .set(
                            ROOM_PREFIX + room.getCode(),
                            objectMapper.writeValueAsString(room),
                            ROOM_TTL);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to store quiz room " + room.getCode(), ex);
        }
    }

    private void acquire(String code, String token) {
        for (int attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
            if (Boolean.TRUE.equals(
                    redis.opsForValue().setIfAbsent(LOCK_PREFIX + code, token, LOCK_TTL))) {
                return;
            }
            try {
                Thread.sleep(LOCK_WAIT_MILLIS);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new RetryLaterException("The room is busy, please try again");
    }

    private void release(String code, String token) {
        String key = LOCK_PREFIX + code;
        if (token.equals(redis.opsForValue().get(key))) {
            redis.delete(key);
        }
    }
}
