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

package com.app.oopsly.api.config;

import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.quiz.interfaces.ws.QuizEventRelay;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Time source, scheduler and Redis subscription used by the live quiz rooms. */
@Configuration
@EnableScheduling
public class QuizConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    /** Subscribes this instance to the quiz channel so it can serve its own sockets. */
    @Bean
    public RedisMessageListenerContainer quizEventContainer(
            RedisConnectionFactory connectionFactory, QuizEventRelay relay) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(relay, new ChannelTopic(QuizChannels.REDIS_CHANNEL));
        return container;
    }
}
