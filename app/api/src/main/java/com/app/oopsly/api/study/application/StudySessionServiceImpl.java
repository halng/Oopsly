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

package com.app.oopsly.api.study.application;

import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionRes;
import com.app.oopsly.api.study.application.vm.StudySessionStartReq;
import com.app.oopsly.api.study.application.vm.StudySessionStartRes;
import com.app.oopsly.api.study.domain.StudyMode;
import com.app.oopsly.api.study.domain.StudySessionEntity;
import com.app.oopsly.api.study.infrastructure.StudySessionRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudySessionServiceImpl implements StudySessionService {

    private static final int LEARN_MAX_ITEMS = 1_000;
    private static final int MATCH_MAX_PAIRS = 6;
    private static final int MATCH_MISTAKE_PENALTY_SECONDS = 1;
    private static final long MILLIS_PER_SECOND = 1_000L;

    private final StudySessionRepository studySessionRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final UserService userService;

    @Override
    @Transactional
    public ApiRes start(UUID shelfId, UUID subjectId, StudySessionStartReq request) {
        if (request.mode() == null) {
            throw new ValidationException("Study mode is required");
        }
        User currentUser = userService.getCurrentUser();
        Subject subject = findOwnedSubject(shelfId, subjectId, currentUser);
        int cardCount = Math.toIntExact(cardRepository.countBySubjectAndDeletedFalse(subject));
        int totalItems =
                switch (request.mode()) {
                    case LEARN -> Math.min(cardCount, LEARN_MAX_ITEMS);
                    case MATCH -> Math.min(cardCount, MATCH_MAX_PAIRS);
                };
        if (totalItems == 0) {
            throw new ValidationException("A study session requires at least one card");
        }
        StudySessionEntity started =
                studySessionRepository.save(
                        StudySessionEntity.builder()
                                .userId(currentUser.getId())
                                .subjectId(subject.getId())
                                .mode(request.mode())
                                .totalItems(totalItems)
                                .startedAt(Instant.now())
                                .completedAt(null)
                                .build());
        return ApiRes.created(
                "Study session started", new StudySessionStartRes(started.getId(), totalItems));
    }

    @Override
    @Transactional
    public ApiRes record(UUID shelfId, UUID subjectId, StudySessionReq request) {
        if (request.mode() == null) {
            throw new ValidationException("Study mode is required");
        }
        User currentUser = userService.getCurrentUser();
        Subject subject = findOwnedSubject(shelfId, subjectId, currentUser);
        StudySessionEntity session =
                studySessionRepository
                        .findUncompletedForUpdate(
                                request.sessionId(), currentUser.getId(), subject.getId())
                        .orElseThrow(
                                () ->
                                        new ValidationException(
                                                "Study session was not found or is already"
                                                        + " completed"));
        if (session.getMode() != request.mode()
                || !session.getTotalItems().equals(request.totalItems())
                || request.correctCount() == null
                || request.correctCount() < session.getTotalItems()
                || (session.getMode() == StudyMode.MATCH
                        && request.correctCount() != session.getTotalItems())
                || request.durationSeconds() == null
                || request.durationSeconds() < 1) {
            throw new ValidationException("Study session completion data is invalid");
        }
        Instant completedAt = Instant.now();
        if (session.getStartedAt() == null) {
            throw new ValidationException("Study session start time is unavailable");
        }
        long elapsedMillis = Duration.between(session.getStartedAt(), completedAt).toMillis();
        if (elapsedMillis < MILLIS_PER_SECOND) {
            throw new ValidationException("Study session must run for at least one second");
        }
        int totalItems = session.getTotalItems();
        int correctCount = Math.min(request.correctCount(), totalItems);
        int mistakes = Math.max(0, valueOrZero(request.mistakes()));
        long durationSeconds = elapsedMillis / MILLIS_PER_SECOND;
        if (session.getMode() == StudyMode.MATCH) {
            durationSeconds += (long) mistakes * MATCH_MISTAKE_PENALTY_SECONDS;
        }
        int duration = (int) Math.min(durationSeconds, Integer.MAX_VALUE);
        int xpGained =
                switch (session.getMode()) {
                    case LEARN -> GamificationRules.learnXp(totalItems);
                    case MATCH -> GamificationRules.matchXp(totalItems, duration);
                };

        session.setCorrectCount(correctCount);
        session.setMistakes(mistakes);
        session.setDurationSeconds(duration);
        session.setXpGained(xpGained);
        session.setCompletedAt(completedAt);
        StudySessionEntity saved = studySessionRepository.save(session);

        if (xpGained > 0) {
            userService.updateUserProgress(xpGained);
        }
        Integer storedXp =
                userService.getCurrentUser().getSetting() == null
                        ? null
                        : userService.getCurrentUser().getSetting().getTotalXp();
        int totalXp = storedXp == null ? xpGained : storedXp;

        log.info(
                "Recorded {} session for subject {}: items={}, xp={}",
                session.getMode(),
                subjectId,
                totalItems,
                xpGained);
        return ApiRes.created(
                "Study session recorded", new StudySessionRes(saved.getId(), xpGained, totalXp));
    }

    private Subject findOwnedSubject(UUID shelfId, UUID subjectId, User currentUser) {
        Shelf shelf =
                shelfRepository
                        .findByIdAndUser(shelfId, currentUser)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Shelve not found with id: " + shelfId));
        return subjectRepository
                .findByIdAndShelve(subjectId, shelf)
                .orElseThrow(
                        () -> new NotFoundException("Subject not found with id: " + subjectId));
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
