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
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.SubjectService;
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
class SubjectCascadeDeleteTest {

    @Autowired private SubjectService subjectService;

    @Autowired private ShelfRepository shelfRepository;

    @Autowired private SubjectRepository subjectRepository;

    @Autowired private CardRepository cardRepository;

    @Autowired private UserRepository userRepository;

    private User testUser;
    private ShelfEntity testShelve;
    private SubjectEntity testSubject;
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

        // Create and save test shelve
        testShelve = new ShelfEntity();
        testShelve.setName("Test Shelve");
        testShelve.setDescription("Test Shelve Description");
        testShelve.setUser(testUser);
        testShelve = shelfRepository.save(testShelve);

        // Create and save test subject
        testSubject = new SubjectEntity();
        testSubject.setName("Test Subject");
        testSubject.setDescription("Test Subject Description");
        testSubject.setShelf(testShelve);
        testSubject = subjectRepository.save(testSubject);

        // Create and save test card
        testCard = new CardEntity();
        testCard.setFront("Test Front");
        testCard.setBack("Test Back");
        testCard.setSubject(testSubject);
        testCard.setNextPracticeTime(Instant.now());
        testCard = cardRepository.save(testCard);
    }

    @Test
    void deleteSubject_cascadeDeletesCards() {
        UUID subjectId = testSubject.getId();
        UUID cardId = testCard.getId();
        UUID shelveId = testShelve.getId();

        // Verify subject and card exist
        Optional<SubjectEntity> subjectBeforeDelete =
                subjectRepository.findByIdAndShelve(subjectId, testShelve);
        assertTrue(subjectBeforeDelete.isPresent());
        assertFalse(subjectBeforeDelete.get().getDeleted());

        Optional<CardEntity> cardBeforeDelete =
                cardRepository.findByIdAndSubject(cardId, testSubject);
        assertTrue(cardBeforeDelete.isPresent());
        assertFalse(cardBeforeDelete.get().getDeleted());

        // Delete the subject
        subjectService.delete(shelveId, subjectId);

        // Verify subject is soft deleted
        Optional<SubjectEntity> subjectAfterDelete = subjectRepository.findById(subjectId);
        assertTrue(subjectAfterDelete.isPresent());
        assertTrue(subjectAfterDelete.get().getDeleted());

        // Verify card is also soft deleted
        Optional<CardEntity> cardAfterDelete = cardRepository.findById(cardId);
        assertTrue(cardAfterDelete.isPresent());
        assertTrue(cardAfterDelete.get().getDeleted());

        // Verify findByIdAndShelve no longer returns the deleted subject
        Optional<SubjectEntity> queryAfterDelete =
                subjectRepository.findByIdAndShelve(subjectId, testShelve);
        assertFalse(queryAfterDelete.isPresent());

        // Verify findByIdAndSubject no longer returns the deleted card
        Optional<CardEntity> cardQueryAfterDelete =
                cardRepository.findByIdAndSubject(cardId, testSubject);
        assertFalse(cardQueryAfterDelete.isPresent());
    }

    @Test
    void deleteSubject_withMultipleCards_deletesAllCards() {
        // Create additional cards
        CardEntity card2 = new CardEntity();
        card2.setFront("Test Front 2");
        card2.setBack("Test Back 2");
        card2.setSubject(testSubject);
        card2.setNextPracticeTime(Instant.now());
        card2 = cardRepository.save(card2);

        CardEntity card3 = new CardEntity();
        card3.setFront("Test Front 3");
        card3.setBack("Test Back 3");
        card3.setSubject(testSubject);
        card3.setNextPracticeTime(Instant.now());
        card3 = cardRepository.save(card3);

        UUID subjectId = testSubject.getId();
        UUID shelveId = testShelve.getId();
        UUID cardId1 = testCard.getId();
        UUID cardId2 = card2.getId();
        UUID cardId3 = card3.getId();

        // Delete the subject
        subjectService.delete(shelveId, subjectId);

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
