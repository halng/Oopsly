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

package com.app.oopsly.api.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.CollectionRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.CollectionService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@EnabledIfSystemProperty(named = "run.integration.tests", matches = "true")
class CollectionCascadeDeleteIntegrationTest {

    @Autowired private CollectionService collectionService;

    @Autowired private DeckRepository deckRepository;

    @Autowired private CollectionRepository collectionRepository;

    @Autowired private CardRepository cardRepository;

    @Autowired private UserRepository userRepository;

    private User testUser;
    private DeckEntity testDeck;
    private CollectionEntity testCollection;
    private CardEntity testCard;

    @BeforeEach
    void setUp() {
        // Create and save test user
        testUser = new User();
        testUser.setEmail("test-integration@example.com");
        testUser.setName("Test User");
        testUser = userRepository.save(testUser);

        // Set security context with test user
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(testUser, null, null));

        // Create and save test deck
        testDeck = new DeckEntity();
        testDeck.setName("Test Deck");
        testDeck.setDescription("Test Deck Description");
        testDeck.setUser(testUser);
        testDeck = deckRepository.save(testDeck);

        // Create and save test collection
        testCollection = new CollectionEntity();
        testCollection.setName("Test Collection");
        testCollection.setDescription("Test Collection Description");
        testCollection.setDeck(testDeck);
        testCollection = collectionRepository.save(testCollection);

        // Create and save test card
        testCard = new CardEntity();
        testCard.setFront("Test Front");
        testCard.setBack("Test Back");
        testCard.setCollection(testCollection);
        testCard.setNextPracticeTime(Instant.now());
        testCard = cardRepository.save(testCard);
    }

    @Test
    void deleteCollection_cascadeDeletesCards() {
        UUID collectionId = testCollection.getId();
        UUID cardId = testCard.getId();
        UUID deckId = testDeck.getId();

        // Verify collection and card exist
        Optional<CollectionEntity> collectionBeforeDelete =
                collectionRepository.findByIdAndDeck(collectionId, testDeck);
        assertTrue(collectionBeforeDelete.isPresent());
        assertFalse(collectionBeforeDelete.get().getDeleted());

        Optional<CardEntity> cardBeforeDelete =
                cardRepository.findByIdAndCollection(cardId, testCollection);
        assertTrue(cardBeforeDelete.isPresent());
        assertFalse(cardBeforeDelete.get().getDeleted());

        // Delete the collection
        collectionService.delete(deckId, collectionId);

        // Verify collection is soft deleted
        Optional<CollectionEntity> collectionAfterDelete =
                collectionRepository.findById(collectionId);
        assertTrue(collectionAfterDelete.isPresent());
        assertTrue(collectionAfterDelete.get().getDeleted());

        // Verify card is also soft deleted
        Optional<CardEntity> cardAfterDelete = cardRepository.findById(cardId);
        assertTrue(cardAfterDelete.isPresent());
        assertTrue(cardAfterDelete.get().getDeleted());

        // Verify findByIdAndDeck no longer returns the deleted collection
        Optional<CollectionEntity> queryAfterDelete =
                collectionRepository.findByIdAndDeck(collectionId, testDeck);
        assertFalse(queryAfterDelete.isPresent());

        // Verify findByIdAndCollection no longer returns the deleted card
        Optional<CardEntity> cardQueryAfterDelete =
                cardRepository.findByIdAndCollection(cardId, testCollection);
        assertFalse(cardQueryAfterDelete.isPresent());
    }

    @Test
    void deleteCollection_withMultipleCards_deletesAllCards() {
        // Create additional cards
        CardEntity card2 = new CardEntity();
        card2.setFront("Test Front 2");
        card2.setBack("Test Back 2");
        card2.setCollection(testCollection);
        card2.setNextPracticeTime(Instant.now());
        card2 = cardRepository.save(card2);

        CardEntity card3 = new CardEntity();
        card3.setFront("Test Front 3");
        card3.setBack("Test Back 3");
        card3.setCollection(testCollection);
        card3.setNextPracticeTime(Instant.now());
        card3 = cardRepository.save(card3);

        UUID collectionId = testCollection.getId();
        UUID deckId = testDeck.getId();
        UUID cardId1 = testCard.getId();
        UUID cardId2 = card2.getId();
        UUID cardId3 = card3.getId();

        // Delete the collection
        collectionService.delete(deckId, collectionId);

        // Verify all cards are soft deleted
        Optional<CardEntity> card1AfterDelete = cardRepository.findById(cardId1);
        assertTrue(card1AfterDelete.isPresent());
        assertTrue(card1AfterDelete.get().getDeleted());

        Optional<CardEntity> card2AfterDelete = cardRepository.findById(cardId2);
        assertTrue(card2AfterDelete.isPresent());
        assertTrue(card2AfterDelete.get().getDeleted());

        Optional<CardEntity> card3AfterDelete = cardRepository.findById(cardId3);
        assertTrue(card3AfterDelete.isPresent());
        assertTrue(card3AfterDelete.get().getDeleted());
    }
}
