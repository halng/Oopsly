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

package com.app.oopsly.api.unit.shared;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.card.CardService;
import com.app.oopsly.api.card.CardServiceImpl;
import com.app.oopsly.api.card.DifficultyLevel;
import com.app.oopsly.api.card.vm.CardItemReq;
import com.app.oopsly.api.card.vm.ReviewResultRes;
import com.app.oopsly.api.card.vm.UpdateDifficultyReq;
import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.stats.infrastructure.ReviewLogRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.subject.SubjectServiceImpl;
import com.app.oopsly.api.subject.vm.SubjectSettingReq;
import com.app.oopsly.api.testsuite.application.TestSuiteService;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionReq;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.app.oopsly.api.testsuite.interfaces.rest.TestSuiteController;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Targeted tests closing the last uncovered branches: not-found guards and null-safe XP totals. */
@DisplayName("Remaining branch coverage")
class RemainingBranchCoverageTest {

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("CardServiceImpl guards")
    class CardServiceTest {

        @Mock private CardRepository cardRepository;
        @Mock private SubjectRepository subjectRepository;
        @Mock private ShelfRepository shelfRepository;
        @Mock private TestSuiteRepository testSuiteRepository;
        @Mock private CurrentUser currentUser;
        @Mock private UserProgressService userProgressService;
        @Mock private ReviewLogRepository reviewLogRepository;

        @InjectMocks private CardServiceImpl cardService;

        private final UUID shelfId = UUID.randomUUID();
        private final UUID subjectId = UUID.randomUUID();
        private final UUID cardId = UUID.randomUUID();

        private Subject resolveSubject() {
            UUID userId = UUID.randomUUID();

            Shelf shelf = new Shelf();
            shelf.setId(shelfId);
            shelf.setUserId(userId);

            Subject subject = new Subject();
            subject.setId(subjectId);
            subject.setShelf(shelf);

            when(currentUser.id()).thenReturn(userId);
            when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
            when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                    .thenReturn(Optional.of(subject));
            return subject;
        }

        @Test
        @DisplayName("updateCard should throw NotFoundException when the card does not exist")
        void updateCard_shouldThrowNotFoundException_whenCardDoesNotExist() {
            Subject subject = resolveSubject();
            when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

            CardItemReq item = new CardItemReq("front", "back");
            assertThrows(
                    NotFoundException.class,
                    () -> cardService.updateCard(shelfId, subjectId, cardId, item));
            verify(cardRepository, never()).save(any());
        }

        @Test
        @DisplayName("updateDifficulty should report the gained XP as total when the user has none")
        void updateDifficulty_shouldReportGainedXpAsTotal_whenUserTotalXpIsNull() {
            Subject subject = resolveSubject();

            Card card = new Card();
            card.setId(cardId);
            card.setSubject(subject);
            card.setFront("front");
            card.setBack("back");
            card.setNumberOfPractice(0);

            when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
            when(userProgressService.updateUserProgress(anyInt()))
                    .thenReturn(UserProgress.builder().totalXp(null).build());

            ApiRes response =
                    cardService.updateDifficulty(
                            shelfId,
                            subjectId,
                            List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name())));

            ReviewResultRes result = (ReviewResultRes) response.getBody().data();
            assertTrue(result.xpGained() > 0);
            assertEquals(result.xpGained(), result.totalXp());
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("SubjectServiceImpl guards")
    class SubjectServiceTest {

        @Mock private SubjectRepository subjectRepository;
        @Mock private ShelfRepository shelfRepository;
        @Mock private CurrentUser currentUser;
        @Mock private CardService cardService;
        @Mock private CardRepository cardRepository;

        @InjectMocks private SubjectServiceImpl subjectService;

        @Test
        @DisplayName("updateSetting should throw NotFoundException when the subject does not exist")
        void updateSetting_shouldThrowNotFoundException_whenSubjectDoesNotExist() {
            UUID shelfId = UUID.randomUUID();
            UUID subjectId = UUID.randomUUID();

            UUID userId = UUID.randomUUID();
            Shelf shelf = new Shelf();
            shelf.setId(shelfId);
            shelf.setUserId(userId);

            when(currentUser.id()).thenReturn(userId);
            when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
            when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                    .thenReturn(Optional.empty());

            SubjectSettingReq request = new SubjectSettingReq(10, 5, 1);
            assertThrows(
                    NotFoundException.class,
                    () -> subjectService.updateSetting(shelfId, subjectId, request));
            verify(subjectRepository, never()).save(any());
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("TestSuiteController submit endpoint")
    class TestSuiteControllerSubmitTest {

        @Mock private TestSuiteService testSuiteService;

        @InjectMocks private TestSuiteController testSuiteController;

        @Test
        @DisplayName("submitRun should delegate to the service when the submission is valid")
        void submitRun_shouldDelegateToService_whenSubmissionIsValid() {
            UUID shelveId = UUID.randomUUID();
            UUID suiteId = UUID.randomUUID();
            TestSubmissionReq request =
                    new TestSubmissionReq(Map.of(UUID.randomUUID(), 1), null, null, 120);
            ApiRes expected = ApiRes.success("submitted");
            when(testSuiteService.submit(shelveId, suiteId, request)).thenReturn(expected);

            assertSame(expected, testSuiteController.submitRun(shelveId, suiteId, request));
            verify(testSuiteService).submit(shelveId, suiteId, request);
        }

        @Test
        @DisplayName("submitRun should propagate NotFoundException when the suite is missing")
        void submitRun_shouldPropagateNotFoundException_whenSuiteIsMissing() {
            UUID shelveId = UUID.randomUUID();
            UUID suiteId = UUID.randomUUID();
            TestSubmissionReq request = new TestSubmissionReq(Map.of(), null, null, 0);
            when(testSuiteService.submit(shelveId, suiteId, request))
                    .thenThrow(new NotFoundException("suite is gone"));

            assertThrows(
                    NotFoundException.class,
                    () -> testSuiteController.submitRun(shelveId, suiteId, request));
        }
    }
}
