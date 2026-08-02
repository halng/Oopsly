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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.FsrsAlgorithm;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CardServiceImpl implements CardService {

    private final CardRepository cardRepository;
    private final SubjectRepository subjectRepository;
    private final ShelfRepository shelfRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final UserService userService;

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID shelfId, UUID subjectId, CardReq request) {
        log.info(
                "Creating {} cards for subject: {} in shelve: {}",
                request.cards().size(),
                subjectId,
                shelfId);
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);

        List<CardEntity> cards =
                request.cards().stream()
                        .map(cardItem -> createCardEntity(cardItem, subject))
                        .collect(Collectors.toList());

        List<CardEntity> savedCards = cardRepository.saveAllAndFlush(cards);
        log.info("Successfully created {} cards for subject: {}", savedCards.size(), subjectId);
        List<CardRes> responseCards =
                savedCards.stream().map(this::toCardRes).collect(Collectors.toList());

        return ApiRes.success("Created successfully", responseCards);
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID shelfId, UUID subjectId, UUID cardId) {
        log.info("Deleting card: {} from subject: {} in shelve: {}", cardId, subjectId, shelfId);
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndSubject(cardId, subject)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        existingCard.setDeleted(true);
        cardRepository.save(existingCard);
        log.info("Successfully deleted card: {}", cardId);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID shelfId, UUID subjectId, UUID cardId) {
        log.info("Getting card: {} from subject: {} in shelve: {}", cardId, subjectId, shelfId);
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);
        CardEntity card =
                cardRepository
                        .findByIdAndSubject(cardId, subject)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        log.info("Successfully retrieved card: {}", cardId);
        return ApiRes.success("Fetched successfully", toCardRes(card));
    }

    @Override
    @CircuitBreaker(
            name = "cardServiceCircuitBreaker",
            fallbackMethod = "getAllCardsBySubjectFallback")
    public ApiRes getAllCardsBySubject(UUID shelfId, UUID subjectId, int page, int size) {
        log.info(
                "Getting all cards for subject: {} in shelve: {} with page: {} and size: {}",
                subjectId,
                shelfId,
                page,
                size);
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);
        Pageable pageable = PageRequest.of(page, size);
        Page<CardEntity> pageData = cardRepository.findAllBySubject(subject, pageable);
        List<CardRes> cards =
                pageData.getContent().stream().map(this::toCardRes).collect(Collectors.toList());

        PagingRes<CardRes> pagingRes =
                new PagingRes<>(
                        cards,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        log.info(
                "Successfully retrieved {} cards for subject: {} (total: {})",
                cards.size(),
                subjectId,
                pageData.getTotalElements());
        return ApiRes.success("Fetched successfully", pagingRes);
    }

    @Override
    public ApiRes getCardsByTestSuite(UUID testSuiteId) {
        com.app.oopsly.api.entity.TestSuiteEntity testSuite =
                testSuiteRepository
                        .findById(testSuiteId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));
        if (testSuite.getDeleted() != null && testSuite.getDeleted()) {
            throw new NotFoundException("Test suite not found with id: " + testSuiteId);
        }
        User currentUser = userService.getCurrentUser();
        if (!testSuite.getShelf().getUser().getId().equals(currentUser.getId())) {
            throw new NotFoundException("Test suite not found with id: " + testSuiteId);
        }
        List<CardEntity> allCards = new ArrayList<>();
        if (testSuite.getSubjects() != null) {
            for (SubjectEntity subject : testSuite.getSubjects()) {
                if (subject.getDeleted() != null && subject.getDeleted()) {
                    continue;
                }
                List<CardEntity> subjectCards =
                        cardRepository
                                .findAllBySubject(subject, PageRequest.of(0, Integer.MAX_VALUE))
                                .getContent();
                allCards.addAll(subjectCards);
            }
        }
        List<CardRes> result = allCards.stream().map(this::toCardRes).collect(Collectors.toList());
        return ApiRes.success("Fetched successfully", result);
    }

    @Override
    public Instant calculateNextPracticeTime(DifficultyLevel difficultyLevel) {
        Instant now = Instant.now();
        return switch (difficultyLevel) {
            case AGAIN -> now.plus(10, ChronoUnit.MINUTES);
            case HARD -> now.plus(1, ChronoUnit.DAYS);
            case GOOD -> now.plus(3, ChronoUnit.DAYS);
            case EASY -> now.plus(15, ChronoUnit.DAYS);
        };
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "updateCardFallback")
    public ApiRes updateCard(UUID shelfId, UUID subjectId, UUID cardId, CardItemReq item) {
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndSubject(cardId, subject)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        existingCard.setFront(item.front());
        existingCard.setBack(item.back());
        cardRepository.save(existingCard);
        log.info("Successfully updated card: {}", cardId);
        return ApiRes.success("Updated successfully", toCardRes(existingCard));
    }

    @Override
    public Pair<Integer, Double> getShortPracticeStats(SubjectEntity subject) {
        log.info("Calculating short practice stats for subject: {}", subject.getId());
        long totalCards = cardRepository.countBySubjectAndDeletedFalse(subject);
        long dueCards = cardRepository.countOverdue(subject);
        if (totalCards == 0) {
            return Pair.of(0, 0.0);
        }
        double percentage = 100.0 - (dueCards * 100.0) / totalCards;
        return Pair.of((int) dueCards, percentage);
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "updateDifficultyFallback")
    public ApiRes updateDifficulty(
            UUID shelfId, UUID subjectId, List<UpdateDifficultyReq> reqList) {
        log.info(
                "Updating difficulty for cards in subject: {} in shelve: {}. Total cards: {}",
                subjectId,
                shelfId,
                reqList.size());
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);

        List<CardEntity> updatedList =
                reqList.stream()
                        .map(
                                item ->
                                        updateSingleCardDifficulty(
                                                subject, item.cardId(), item.newLevel()))
                        .collect(Collectors.toList());
        cardRepository.saveAll(updatedList);

        userService.updateUserProgress(10 * updatedList.size());
        log.info("Successfully updated difficulty for all cards in subject: {}", subjectId);
        return ApiRes.success("Updated successfully");
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "getDueCardsFallback")
    public ApiRes getDueCards(UUID shelfId, UUID subjectId, int limit) {
        log.info(
                "Getting due cards for subject: {} in shelve: {} with limit: {}",
                subjectId,
                shelfId,
                limit);
        SubjectEntity subject = getSubjectForCurrentUser(shelfId, subjectId);
        List<CardEntity> dueCards =
                cardRepository
                        .findDueBySubjectAndLimit(subject, Instant.now(), PageRequest.of(0, limit))
                        .getContent();
        List<CardRes> result = dueCards.stream().map(this::toCardRes).collect(Collectors.toList());
        log.info("Successfully retrieved {} due cards for subject: {}", result.size(), subjectId);
        return ApiRes.success("Fetched successfully", result);
    }

    private CardEntity updateSingleCardDifficulty(
            SubjectEntity subject, UUID cardId, String difficultyLevel) {
        CardEntity existingCard =
                cardRepository
                        .findByIdAndSubject(cardId, subject)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        DifficultyLevel level = DifficultyLevel.fromString(difficultyLevel);
        int grade = toFsrsGrade(level);

        FsrsAlgorithm.CardState cardState =
                new FsrsAlgorithm.CardState(
                        existingCard.getFsrsStability(),
                        existingCard.getFsrsDifficulty(),
                        existingCard.getFsrsIntervalDays(),
                        existingCard.getFsrsRepetitions());

        FsrsAlgorithm.ScheduleResult result = FsrsAlgorithm.schedule(cardState, grade);

        Instant now = Instant.now();
        Instant nextPractice =
                result.intervalDays() == 0
                        ? now.plus(10, ChronoUnit.MINUTES)
                        : now.plus(result.intervalDays(), ChronoUnit.DAYS);

        existingCard.setDifficultyLevel(level);
        existingCard.setFsrsStability(result.stability());
        existingCard.setFsrsDifficulty(result.difficulty());
        existingCard.setFsrsIntervalDays(result.intervalDays());
        existingCard.setFsrsRepetitions(result.repetitions());
        existingCard.setLastReviewedAt(now);
        existingCard.setNextPracticeTime(nextPractice);
        existingCard.setNumberOfPractice(existingCard.getNumberOfPractice() + 1);

        return existingCard;
    }

    private int toFsrsGrade(DifficultyLevel level) {
        return switch (level) {
            case AGAIN -> 1;
            case HARD -> 2;
            case GOOD -> 3;
            case EASY -> 4;
        };
    }

    private CardEntity toEntityFromItem(CardItemReq item) {
        return CardEntity.builder().front(item.front()).back(item.back()).build();
    }

    private CardEntity createCardEntity(CardItemReq cardItem, SubjectEntity subject) {
        CardEntity card = toEntityFromItem(cardItem);
        card.setSubject(subject);
        card.setNextPracticeTime(Instant.now());
        return card;
    }

    private CardRes toCardRes(CardEntity entity) {
        return new CardRes(
                entity.getId(),
                entity.getFront(),
                entity.getBack(),
                entity.getDifficultyLevel(),
                entity.getNextPracticeTime(),
                entity.getNumberOfPractice(),
                entity.getFsrsStability(),
                entity.getFsrsDifficulty(),
                entity.getFsrsIntervalDays(),
                entity.getFsrsRepetitions());
    }

    private SubjectEntity getSubjectForCurrentUser(UUID shelfId, UUID subjectId) {
        ShelfEntity shelve = getShelveForCurrentUser(shelfId);
        return subjectRepository
                .findByIdAndShelve(subjectId, shelve)
                .orElseThrow(
                        () -> new NotFoundException("Subject not found with id: " + subjectId));
    }

    private ShelfEntity getShelveForCurrentUser(UUID shelfId) {
        User currentUser = userService.getCurrentUser();
        log.debug(
                "Getting shelve: {} for user: {}",
                shelfId,
                StringUtils.masked(currentUser.getEmail()));
        return shelfRepository
                .findByIdAndUser(shelfId, currentUser)
                .orElseThrow(() -> new NotFoundException("Shelve not found with id: " + shelfId));
    }

    /** FALLBACK METHODS FOR CIRCUIT BREAKER */

    // Fallback method for create
    public ApiRes createFallback(UUID shelfId, UUID subjectId, CardReq request, Throwable t) {
        log.error(
                "Card service unavailable during create: {}, shelfId={}, subjectId={}",
                t.getMessage(),
                shelfId,
                subjectId);
        throw unwrapCardException(t);
    }

    // Fallback method for updateDifficulty
    public ApiRes updateDifficultyFallback(
            UUID shelfId, UUID subjectId, List<UpdateDifficultyReq> reqList, Throwable t) {
        log.error(
                "Card service unavailable during updateDifficulty: {}, shelfId={}, subjectId={}",
                t.getMessage(),
                shelfId,
                subjectId);
        throw unwrapCardException(t);
    }

    // Fallback method for updateCard
    public ApiRes updateCardFallback(
            UUID shelfId, UUID subjectId, UUID cardId, CardItemReq item, Throwable t) {
        log.error(
                "Card service unavailable during updateCard: {}, shelfId={}, subjectId={},"
                        + " cardId={}",
                t.getMessage(),
                shelfId,
                subjectId,
                cardId);
        throw unwrapCardException(t);
    }

    // Fallback method for getAllCardsBySubject
    public ApiRes getAllCardsBySubjectFallback(
            UUID shelfId, UUID subjectId, int page, int size, Throwable t) {
        log.error(
                "Card service unavailable during getAllCardsBySubject: {}, shelfId={},"
                        + " subjectId={}, page={}, size={}",
                t.getMessage(),
                shelfId,
                subjectId,
                page,
                size);
        throw unwrapCardException(t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID shelfId, UUID subjectId, UUID cardId, Throwable t) {
        log.error(
                "Card service unavailable during delete: {}, shelfId={}, subjectId={}, cardId={}",
                t.getMessage(),
                shelfId,
                subjectId,
                cardId);
        throw unwrapCardException(t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID shelfId, UUID subjectId, UUID cardId, Throwable t) {
        log.error(
                "Card service unavailable during getById: {}, shelfId={}, subjectId={},"
                        + " cardId={}",
                t.getMessage(),
                shelfId,
                subjectId,
                cardId);
        throw unwrapCardException(t);
    }

    // Fallback method for getDueCards
    public ApiRes getDueCardsFallback(UUID shelfId, UUID subjectId, int limit, Throwable t) {
        log.error(
                "Card service unavailable during getDueCards: {}, shelfId={}, subjectId={}",
                t.getMessage(),
                shelfId,
                subjectId);
        throw unwrapCardException(t);
    }

    private RuntimeException unwrapCardException(Throwable t) {
        if (t instanceof NotFoundException nfe) {
            return nfe;
        }
        if (t instanceof UnauthenticatedException ue) {
            return ue;
        }
        if (t instanceof ValidationException ve) {
            return ve;
        }
        if (t instanceof IllegalArgumentException iae) {
            return iae;
        }
        return new RetryLaterException(
                "Card service is currently unavailable. Please try again later.", t);
    }
}
