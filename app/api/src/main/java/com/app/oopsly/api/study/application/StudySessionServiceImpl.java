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
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionRes;
import com.app.oopsly.api.study.domain.StudySessionEntity;
import com.app.oopsly.api.study.infrastructure.StudySessionRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudySessionServiceImpl implements StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final CurrentUser currentUser;
    private final UserProgressService userProgressService;

    @Override
    @Transactional
    public ApiRes record(UUID shelfId, UUID subjectId, StudySessionReq request) {
        if (request.mode() == null) {
            throw new ValidationException("Study mode is required");
        }
        Shelf shelf =
                shelfRepository
                        .findByIdAndUserId(shelfId, currentUser.id())
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Shelve not found with id: " + shelfId));
        Subject subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        int cardCount = (int) cardRepository.countBySubjectAndDeletedFalse(subject);
        int totalItems = clamp(request.totalItems(), cardCount);
        int correctCount = clamp(request.correctCount(), totalItems);
        int mistakes = Math.max(0, valueOrZero(request.mistakes()));
        int duration = Math.max(0, valueOrZero(request.durationSeconds()));

        int xpGained =
                switch (request.mode()) {
                    case LEARN -> GamificationRules.learnXp(totalItems);
                    case MATCH -> GamificationRules.matchXp(totalItems, duration);
                };

        StudySessionEntity saved =
                studySessionRepository.save(
                        StudySessionEntity.builder()
                                .userId(currentUser.id())
                                .subjectId(subject.getId())
                                .mode(request.mode())
                                .totalItems(totalItems)
                                .correctCount(correctCount)
                                .mistakes(mistakes)
                                .durationSeconds(duration)
                                .xpGained(xpGained)
                                .completedAt(Instant.now())
                                .build());

        Integer storedXp =
                (xpGained > 0
                                ? userProgressService.updateUserProgress(xpGained)
                                : userProgressService.getCurrent())
                        .getTotalXp();
        int totalXp = storedXp == null ? xpGained : storedXp;

        log.info(
                "Recorded {} session for subject {}: items={}, xp={}",
                request.mode(),
                subjectId,
                totalItems,
                xpGained);
        return ApiRes.created(
                "Study session recorded", new StudySessionRes(saved.getId(), xpGained, totalXp));
    }

    private static int clamp(Integer value, int max) {
        return Math.max(0, Math.min(valueOrZero(value), max));
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
