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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.app.osmosis.api.service.impl.DeckServiceImpl;
import com.app.osmosis.api.viewmodel.ApiRes;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class DeckServiceImplTest {

    private DeckServiceImpl deckService;
    private Logger logger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        deckService = new DeckServiceImpl();

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
        ApiRes res = deckService.createDeck();

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
        deckService.createDeck();
        deckService.createDeck();

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
