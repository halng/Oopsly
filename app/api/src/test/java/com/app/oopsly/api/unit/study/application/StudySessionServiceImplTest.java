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

package com.app.oopsly.api.unit.study.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.study.application.StudySessionServiceImpl;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionRes;
import com.app.oopsly.api.study.domain.StudyMode;
import com.app.oopsly.api.study.domain.StudySessionEntity;
import com.app.oopsly.api.study.infrastructure.StudySessionRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceImplTest {

    @Mock private StudySessionRepository studySessionRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private CardRepository cardRepository;
    @Mock private CurrentUser currentUser;
    @Mock private UserProgressService userProgressService;
    @InjectMocks private StudySessionServiceImpl service;

    private final UUID shelfId = UUID.randomUUID();
    private final UUID subjectId = UUID.randomUUID();
    private UUID userId;
    private UserProgress progress;
    private Shelf shelf;
    private Subject subject;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        progress = UserProgress.builder().userId(userId).totalXp(100).build();
        shelf = new Shelf();
        shelf.setId(shelfId);
        subject = new Subject();
        subject.setId(subjectId);
    }

    private void stubOwnership() {
        when(currentUser.id()).thenReturn(userId);
        lenient().when(userProgressService.updateUserProgress(anyInt())).thenReturn(progress);
        lenient().when(userProgressService.getCurrent()).thenReturn(progress);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(studySessionRepository.save(any(StudySessionEntity.class)))
                .thenAnswer(
                        inv -> {
                            StudySessionEntity e = inv.getArgument(0);
                            e.setId(UUID.randomUUID());
                            return e;
                        });
    }

    @Test
    void learn_capsTotalItemsAndCreditsXp() {
        stubOwnership();
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(4L);

        ApiRes res =
                service.record(
                        shelfId, subjectId, new StudySessionReq(StudyMode.LEARN, 40, 99, 3, 200));

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        StudySessionRes data = (StudySessionRes) res.getBody().data();
        assertEquals(4 * 5 + 25, data.xpGained());
        assertEquals(100, data.totalXp());
        verify(userProgressService).updateUserProgress(45);

        ArgumentCaptor<StudySessionEntity> captor =
                ArgumentCaptor.forClass(StudySessionEntity.class);
        verify(studySessionRepository).save(captor.capture());
        StudySessionEntity saved = captor.getValue();
        assertEquals(4, saved.getTotalItems());
        assertEquals(4, saved.getCorrectCount());
        assertEquals(3, saved.getMistakes());
        assertEquals(200, saved.getDurationSeconds());
        assertEquals(userId, saved.getUserId());
    }

    @Test
    void match_slowRun_getsBaseXpOnly() {
        stubOwnership();
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(10L);

        ApiRes res =
                service.record(
                        shelfId, subjectId, new StudySessionReq(StudyMode.MATCH, 6, 6, 2, 90));

        assertEquals(20, ((StudySessionRes) res.getBody().data()).xpGained());
    }

    @Test
    void match_fastRun_getsBonus() {
        stubOwnership();
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(10L);

        ApiRes res =
                service.record(
                        shelfId, subjectId, new StudySessionReq(StudyMode.MATCH, 6, 6, 0, 20));

        assertEquals(30, ((StudySessionRes) res.getBody().data()).xpGained());
    }

    @Test
    void emptySubject_awardsNoXp_andNullsDefaultToZero() {
        stubOwnership();
        progress.setTotalXp(0);
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(0L);

        ApiRes res =
                service.record(
                        shelfId,
                        subjectId,
                        new StudySessionReq(StudyMode.LEARN, 5, null, null, null));

        StudySessionRes data = (StudySessionRes) res.getBody().data();
        assertEquals(0, data.xpGained());
        assertEquals(0, data.totalXp());
        verify(userProgressService, never()).updateUserProgress(anyInt());
    }

    @Test
    void missingMode_throwsValidation() {
        assertThrows(
                ValidationException.class,
                () -> service.record(shelfId, subjectId, new StudySessionReq(null, 1, 0, 0, 0)));
    }

    @Test
    void unknownShelf_throwsNotFound() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(StudyMode.MATCH, 1, 1, 0, 1)));
    }

    @Test
    void unknownSubject_throwsNotFound() {
        when(currentUser.id()).thenReturn(userId);
        when(shelfRepository.findByIdAndUserId(shelfId, userId)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(StudyMode.MATCH, 1, 1, 0, 1)));
    }
}
