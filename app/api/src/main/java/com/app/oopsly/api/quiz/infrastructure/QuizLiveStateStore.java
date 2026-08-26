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

import com.app.oopsly.api.quiz.application.vm.QuizCardView;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/** Keeps the volatile card deck of a live quiz room in Redis. */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuizLiveStateStore {

    private static final String KEY_PREFIX = "quiz_cards:";
    private static final Duration TTL = Duration.ofHours(6);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void saveCards(String roomCode, List<QuizCardView> cards) {
        try {
            redisTemplate
                    .opsForValue()
                    .set(KEY_PREFIX + roomCode, objectMapper.writeValueAsString(cards), TTL);
        } catch (Exception ex) {
            log.error("Unable to cache quiz cards for room {}", roomCode, ex);
        }
    }

    public List<QuizCardView> getCards(String roomCode) {
        try {
            String raw = redisTemplate.opsForValue().get(KEY_PREFIX + roomCode);
            if (raw == null) {
                return List.of();
            }
            return objectMapper.readValue(raw, new TypeReference<List<QuizCardView>>() {});
        } catch (Exception ex) {
            log.error("Unable to read quiz cards for room {}", roomCode, ex);
            return List.of();
        }
    }

    public void clear(String roomCode) {
        redisTemplate.delete(KEY_PREFIX + roomCode);
    }
}
