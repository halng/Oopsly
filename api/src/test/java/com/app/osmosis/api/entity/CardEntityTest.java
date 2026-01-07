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

package com.app.osmosis.api.entity;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CardEntityTest {

    private CardEntity card;
    private DeckEntity deck;

    @BeforeEach
    void setUp() {
        deck = DeckEntity.builder().id(UUID.randomUUID()).name("Test Deck").build();

        card =
                CardEntity.builder()
                        .id(UUID.randomUUID())
                        .deck(deck)
                        .prompt("What is Java?")
                        .answer("A programming language")
                        .build();
    }

    @Test
    void prePersist_initializesDueAtToNow_whenNull() {
        card.setDueAt(null);
        card.setIntervalMinutes(0);

        card.initializeSchedule();

        assertNotNull(card.getDueAt());
        assertTrue(card.getDueAt().isBefore(Instant.now().plusSeconds(5)));
        assertTrue(card.getDueAt().isAfter(Instant.now().minusSeconds(5)));
    }

    @Test
    void prePersist_initializesIntervalTo10_whenZero() {
        card.setDueAt(null);
        card.setIntervalMinutes(0);

        card.initializeSchedule();

        assertEquals(10, card.getIntervalMinutes());
    }

    @Test
    void prePersist_doesNotOverrideDueAt_whenAlreadySet() {
        Instant existingDueAt = Instant.now().plus(1, ChronoUnit.HOURS);
        card.setDueAt(existingDueAt);
        card.setIntervalMinutes(20);

        card.initializeSchedule();

        assertEquals(existingDueAt, card.getDueAt());
    }

    @Test
    void prePersist_doesNotOverrideInterval_whenNonZero() {
        card.setDueAt(Instant.now());
        card.setIntervalMinutes(30);

        card.initializeSchedule();

        assertEquals(30, card.getIntervalMinutes());
    }

    @Test
    void scheduleNext_doublesInterval_whenAnsweredCorrectly() {
        card.setIntervalMinutes(10);
        card.setDueAt(Instant.now().minus(1, ChronoUnit.HOURS));

        Instant beforeCall = Instant.now();
        card.scheduleNext(true);
        Instant afterCall = Instant.now();

        assertEquals(20, card.getIntervalMinutes());
        assertTrue(card.getDueAt().isAfter(beforeCall.plus(19, ChronoUnit.MINUTES)));
        assertTrue(card.getDueAt().isBefore(afterCall.plus(21, ChronoUnit.MINUTES)));
    }

    @Test
    void scheduleNext_setsIntervalTo5_whenAnsweredIncorrectly() {
        card.setIntervalMinutes(20);
        card.setDueAt(Instant.now().minus(1, ChronoUnit.HOURS));

        Instant beforeCall = Instant.now();
        card.scheduleNext(false);
        Instant afterCall = Instant.now();

        assertEquals(5, card.getIntervalMinutes());
        assertTrue(card.getDueAt().isAfter(beforeCall.plus(4, ChronoUnit.MINUTES)));
        assertTrue(card.getDueAt().isBefore(afterCall.plus(6, ChronoUnit.MINUTES)));
    }

    @Test
    void scheduleNext_respectsMinimumInterval_whenDoubling() {
        card.setIntervalMinutes(3);

        card.scheduleNext(true);

        assertEquals(10, card.getIntervalMinutes());
    }

    @Test
    void scheduleNext_updatesAndroidDueAt_correctly() {
        card.setIntervalMinutes(15);
        Instant now = Instant.now();

        card.scheduleNext(true);

        long expectedSeconds = 30 * 60;
        long actualDiff = ChronoUnit.SECONDS.between(now, card.getDueAt());

        assertTrue(actualDiff >= expectedSeconds - 2);
        assertTrue(actualDiff <= expectedSeconds + 2);
    }
}
