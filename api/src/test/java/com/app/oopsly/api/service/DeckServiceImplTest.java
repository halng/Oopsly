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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.DeckServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class DeckServiceImplTest {

    private DeckRepository deckRepository;
    private UserService userService;
    private DeckServiceImpl deckService;
    private Logger logger;
    private ListAppender<ILoggingEvent> listAppender;
    private DeckReq deckReq;

    @BeforeEach
    void setUp() {
        deckReq = new DeckReq("Sample Deck", "A deck for testing purposes");
        deckRepository = mock(DeckRepository.class);
        userService = mock(UserService.class);
        deckService = new DeckServiceImpl(deckRepository, userService);

        logger = (Logger) LoggerFactory.getLogger(DeckServiceImpl.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        logger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (listAppender != null) {
            logger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    void createDeck_returnsApiResWithExpectedMessage_andLogsInfo() {
        ApiRes res = deckService.create(deckReq);

        assertNotNull(res, "Expected non-null ApiRes");

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty(), "Expected at least one log entry");
        boolean found =
                logs.stream()
                        .anyMatch(
                                e ->
                                        e.getLevel() == Level.INFO
                                                && e.getFormattedMessage().contains("Create deck"));
        assertTrue(found, "Expected an INFO log containing 'Create deck'");
    }

    @Test
    void createDeck_calledMultipleTimes_logsEachInvocation() {
        deckService.create(deckReq);
        deckService.create(deckReq);

        List<ILoggingEvent> logs = listAppender.list;
        long createDeckCount =
                logs.stream()
                        .filter(
                                e ->
                                        e.getLevel() == Level.INFO
                                                && e.getFormattedMessage().contains("Create deck"))
                        .count();
        assertTrue(
                createDeckCount >= 2,
                "Expected at least two 'Create deck' INFO log entries after two invocations");
    }
}
