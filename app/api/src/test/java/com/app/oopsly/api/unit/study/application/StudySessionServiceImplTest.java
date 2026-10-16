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
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.study.application.StudySessionServiceImpl;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionRes;
import com.app.oopsly.api.study.application.vm.StudySessionStartReq;
import com.app.oopsly.api.study.application.vm.StudySessionStartRes;
import com.app.oopsly.api.study.domain.StudyMode;
import com.app.oopsly.api.study.domain.StudySessionEntity;
import com.app.oopsly.api.study.infrastructure.StudySessionRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import java.time.Instant;
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
    @Mock private UserService userService;
    @InjectMocks private StudySessionServiceImpl service;

    private final UUID shelfId = UUID.randomUUID();
    private final UUID subjectId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();
    private User user;
    private Shelf shelf;
    private Subject subject;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        Setting setting = new Setting();
        setting.setTotalXp(100);
        user.setSetting(setting);
        shelf = new Shelf();
        shelf.setId(shelfId);
        subject = new Subject();
        subject.setId(subjectId);
    }

    private void stubOwnership() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
    }

    private void stubSave() {
        when(studySessionRepository.save(any(StudySessionEntity.class)))
                .thenAnswer(
                        inv -> {
                            StudySessionEntity e = inv.getArgument(0);
                            if (e.getId() == null) e.setId(UUID.randomUUID());
                            return e;
                        });
    }

    private void stubPendingSession(StudyMode mode, int totalItems, int elapsedSeconds) {
        StudySessionEntity session = new StudySessionEntity();
        session.setId(sessionId);
        session.setUserId(user.getId());
        session.setSubjectId(subjectId);
        session.setMode(mode);
        session.setTotalItems(totalItems);
        session.setStartedAt(Instant.now().minusSeconds(elapsedSeconds));
        when(studySessionRepository.findUncompletedForUpdate(sessionId, user.getId(), subjectId))
                .thenReturn(Optional.of(session));
    }

    @Test
    void start_tracksSessionAndLimitsMatchPairsToSix() {
        stubOwnership();
        stubSave();
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(12L);

        ApiRes res = service.start(shelfId, subjectId, new StudySessionStartReq(StudyMode.MATCH));

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        StudySessionStartRes data = (StudySessionStartRes) res.getBody().data();
        assertNotNull(data.id());
        assertEquals(6, data.totalItems());

        ArgumentCaptor<StudySessionEntity> captor =
                ArgumentCaptor.forClass(StudySessionEntity.class);
        verify(studySessionRepository).save(captor.capture());
        assertEquals(6, captor.getValue().getTotalItems());
        assertEquals(StudyMode.MATCH, captor.getValue().getMode());
        assertNull(captor.getValue().getCompletedAt());
        verify(userService, never()).updateUserProgress(anyInt());
    }

    @Test
    void learn_recordsOnlyTheServerTrackedCompletedSession() {
        stubOwnership();
        stubSave();
        stubPendingSession(StudyMode.LEARN, 4, 100);

        ApiRes res =
                service.record(
                        shelfId,
                        subjectId,
                        new StudySessionReq(sessionId, StudyMode.LEARN, 4, 4, 3, 200));

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        StudySessionRes data = (StudySessionRes) res.getBody().data();
        assertEquals(4 * 5 + 25, data.xpGained());
        assertEquals(100, data.totalXp());
        verify(userService).updateUserProgress(45);

        ArgumentCaptor<StudySessionEntity> captor =
                ArgumentCaptor.forClass(StudySessionEntity.class);
        verify(studySessionRepository).save(captor.capture());
        StudySessionEntity saved = captor.getValue();
        assertEquals(4, saved.getTotalItems());
        assertEquals(4, saved.getCorrectCount());
        assertEquals(3, saved.getMistakes());
        assertEquals(100, saved.getDurationSeconds());
        assertEquals(user.getId(), saved.getUserId());
        assertNotNull(saved.getCompletedAt());
    }

    @Test
    void match_slowRun_getsBaseXpOnly() {
        stubOwnership();
        stubSave();
        stubPendingSession(StudyMode.MATCH, 6, 90);

        ApiRes res =
                service.record(
                        shelfId,
                        subjectId,
                        new StudySessionReq(sessionId, StudyMode.MATCH, 6, 6, 2, 90));

        assertEquals(20, ((StudySessionRes) res.getBody().data()).xpGained());
    }

    @Test
    void match_fastRun_getsBonus() {
        stubOwnership();
        stubSave();
        stubPendingSession(StudyMode.MATCH, 6, 20);

        ApiRes res =
                service.record(
                        shelfId,
                        subjectId,
                        new StudySessionReq(sessionId, StudyMode.MATCH, 6, 6, 0, 20));

        assertEquals(30, ((StudySessionRes) res.getBody().data()).xpGained());
    }

    @Test
    void emptySubjectCannotStartARewardableSession() {
        stubOwnership();
        user.setSetting(null);
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(0L);

        assertThrows(
                ValidationException.class,
                () -> service.start(shelfId, subjectId, new StudySessionStartReq(StudyMode.LEARN)));
        verify(userService, never()).updateUserProgress(anyInt());
    }

    @Test
    void missingMode_throwsValidation() {
        assertThrows(
                ValidationException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, null, 1, 0, 0, 0)));
    }

    @Test
    void completionWithNoCorrectAnswersOrNoTimeIsRejected() {
        stubOwnership();
        stubPendingSession(StudyMode.LEARN, 4, 100);

        assertThrows(
                ValidationException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, StudyMode.LEARN, 4, 0, 3, 0)));
        verify(userService, never()).updateUserProgress(anyInt());
    }

    @Test
    void completionCannotClaimMoreItemsThanTheStartedSession() {
        stubOwnership();
        stubPendingSession(StudyMode.LEARN, 4, 100);

        assertThrows(
                ValidationException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, StudyMode.LEARN, 5, 5, 0, 10)));
        verify(userService, never()).updateUserProgress(anyInt());
    }

    @Test
    void completedOrUnknownSessionCannotEarnXpAgain() {
        stubOwnership();
        when(studySessionRepository.findUncompletedForUpdate(sessionId, user.getId(), subjectId))
                .thenReturn(Optional.empty());

        assertThrows(
                ValidationException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, StudyMode.LEARN, 4, 2, 0, 10)));
        verify(userService, never()).updateUserProgress(anyInt());
    }

    @Test
    void unknownShelf_throwsNotFound() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, StudyMode.MATCH, 1, 1, 0, 1)));
    }

    @Test
    void unknownSubject_throwsNotFound() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () ->
                        service.record(
                                shelfId,
                                subjectId,
                                new StudySessionReq(sessionId, StudyMode.MATCH, 1, 1, 0, 1)));
    }
}
