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

package com.app.oopsly.api.unit.quiz.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.quiz.domain.QuizPlayerEntity;
import com.app.oopsly.api.quiz.domain.QuizSessionEntity;
import com.app.oopsly.api.quiz.domain.QuizState;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import org.junit.jupiter.api.Test;

class QuizDomainTest {

    @Test
    void roomTopic_isScopedPerRoom() {
        assertEquals("/topic/quiz/123456", QuizChannels.roomTopic("123456"));
        assertNotEquals(QuizChannels.roomTopic("111111"), QuizChannels.roomTopic("222222"));
    }

    @Test
    void channelPrefixes_areStable() {
        assertEquals("/ws", QuizChannels.ENDPOINT);
        assertEquals("/app", QuizChannels.APP_PREFIX);
        assertEquals("/topic", QuizChannels.TOPIC_PREFIX);
        assertEquals("/queue", QuizChannels.QUEUE_PREFIX);
        assertEquals("/user", QuizChannels.USER_PREFIX);
        assertEquals("/queue/quiz", QuizChannels.USER_QUEUE_QUIZ);
    }

    @Test
    void roomCodeRange_alwaysProducesSixDigitCodes() {
        assertEquals(6, String.valueOf(QuizChannels.ROOM_CODE_MIN).length());
        assertEquals(
                6,
                String.valueOf(QuizChannels.ROOM_CODE_MIN + QuizChannels.ROOM_CODE_BOUND - 1)
                        .length());
    }

    @Test
    void utilityClass_hasPrivateConstructor() throws Exception {
        Constructor<QuizChannels> constructor = QuizChannels.class.getDeclaredConstructor();
        assertTrue(Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        assertNotNull(constructor.newInstance());
    }

    @Test
    void quizState_hasFullLifecycle() {
        assertEquals(4, QuizState.values().length);
        assertEquals(QuizState.LOBBY, QuizState.valueOf("LOBBY"));
        assertEquals(QuizState.FINISHED, QuizState.valueOf("FINISHED"));
    }

    @Test
    void sessionEntity_hasSafeDefaults() {
        QuizSessionEntity session = QuizSessionEntity.builder().roomCode("123456").build();

        assertEquals(QuizState.LOBBY, session.getState());
        assertEquals(-1, session.getCurrentQuestionIndex());
        assertNotNull(session.getStartedAt());
        assertNull(session.getFinishedAt());
        assertTrue(session.getPlayers().isEmpty());
    }

    @Test
    void playerEntity_hasSafeDefaults() {
        QuizPlayerEntity player =
                QuizPlayerEntity.builder().displayName("Ana").sessionKey("k").build();

        assertEquals(0, player.getScore());
        assertNull(player.getCurrentAnswer());
        assertNotNull(player.getJoinedAt());
    }
}
