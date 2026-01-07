/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryStore;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryStore;
import org.springframework.ai.chat.memory.MessageChatMemoryAdvisor;

class TutorConfigTest {

    private final TutorConfig tutorConfig = new TutorConfig();

    @Test
    void chatMemoryStore_returnsInMemoryChatMemoryStore() {
        ChatMemoryStore result = tutorConfig.chatMemoryStore();

        assertNotNull(result);
        assertInstanceOf(InMemoryChatMemoryStore.class, result);
    }

    @Test
    void chatMemory_returnsInMemoryChatMemory() {
        ChatMemoryStore store = tutorConfig.chatMemoryStore();

        ChatMemory result = tutorConfig.chatMemory(store);

        assertNotNull(result);
        assertInstanceOf(InMemoryChatMemory.class, result);
    }

    @Test
    void messageChatMemoryAdvisor_returnsAdvisorWithChatMemory() {
        ChatMemoryStore store = tutorConfig.chatMemoryStore();
        ChatMemory memory = tutorConfig.chatMemory(store);

        MessageChatMemoryAdvisor result = tutorConfig.messageChatMemoryAdvisor(memory);

        assertNotNull(result);
        assertInstanceOf(MessageChatMemoryAdvisor.class, result);
    }

    @Test
    void beanConfiguration_integrationTest() {
        ChatMemoryStore store = tutorConfig.chatMemoryStore();
        ChatMemory memory = tutorConfig.chatMemory(store);
        MessageChatMemoryAdvisor advisor = tutorConfig.messageChatMemoryAdvisor(memory);

        assertNotNull(store);
        assertNotNull(memory);
        assertNotNull(advisor);
    }
}
