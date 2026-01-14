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
import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.CollectionRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CardServiceImpl implements CardService {

    private final CardRepository cardRepository;
    private final CollectionRepository collectionRepository;
    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID deckId, UUID collectionId, CardReq request) {
        log.info(
                "Creating {} cards for collection: {} in deck: {}",
                request.cards().size(),
                collectionId,
                deckId);
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);

        List<CardEntity> cards =
                request.cards().stream()
                        .map(cardItem -> createCardEntity(cardItem, collection))
                        .collect(Collectors.toList());

        List<CardEntity> savedCards = cardRepository.saveAllAndFlush(cards);
        log.info(
                "Successfully created {} cards for collection: {}",
                savedCards.size(),
                collectionId);
        List<CardRes> responseCards =
                savedCards.stream().map(this::toCardRes).collect(Collectors.toList());

        return ApiRes.success("Created successfully", responseCards);
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID deckId, UUID collectionId, UUID cardId) {
        log.info("Deleting card: {} from collection: {} in deck: {}", cardId, collectionId, deckId);
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndCollection(cardId, collection)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        existingCard.setDeleted(true);
        cardRepository.save(existingCard);
        log.info("Successfully deleted card: {}", cardId);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID deckId, UUID collectionId, UUID cardId) {
        log.info("Getting card: {} from collection: {} in deck: {}", cardId, collectionId, deckId);
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);
        CardEntity card =
                cardRepository
                        .findByIdAndCollection(cardId, collection)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        log.info("Successfully retrieved card: {}", cardId);
        return ApiRes.success("Fetched successfully", toCardRes(card));
    }

    @Override
    @CircuitBreaker(
            name = "cardServiceCircuitBreaker",
            fallbackMethod = "getAllCardsByCollectionFallback")
    public ApiRes getAllCardsByCollection(UUID deckId, UUID collectionId, int page, int size) {
        log.info(
                "Getting all cards for collection: {} in deck: {} with page: {} and size: {}",
                collectionId,
                deckId,
                page,
                size);
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);
        Pageable pageable = PageRequest.of(page, size);
        Page<CardEntity> pageData = cardRepository.findAllByCollection(collection, pageable);
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
                "Successfully retrieved {} cards for collection: {} (total: {})",
                cards.size(),
                collectionId,
                pageData.getTotalElements());
        return ApiRes.success("Fetched successfully", pagingRes);
    }

    @Override
    public Instant calculateNextPracticeTime(DifficultyLevel difficultyLevel) {
        Instant now = Instant.now();
        return switch (difficultyLevel) {
            case AGAIN -> now.plus(1, ChronoUnit.MINUTES);
            case HARD -> now.plus(10, ChronoUnit.MINUTES);
            case GOOD -> now.plus(1, ChronoUnit.DAYS);
            case EASY -> now.plus(4, ChronoUnit.DAYS);
        };
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "updateCardFallback")
    public ApiRes updateCard(UUID deckId, UUID collectionId, UUID cardId, CardItemReq item) {
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndCollection(cardId, collection)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        existingCard.setFront(item.front());
        existingCard.setBack(item.back());
        cardRepository.save(existingCard);
        log.info("Successfully updated card: {}", cardId);
        return ApiRes.success("Updated successfully", toCardRes(existingCard));
    }

    @Override
    @CircuitBreaker(name = "cardServiceCircuitBreaker", fallbackMethod = "updateDifficultyFallback")
    public ApiRes updateDifficulty(
            UUID deckId, UUID collectionId, List<UpdateDifficultyReq> reqList) {
        log.info(
                "Updating difficulty for cards in collection: {} in deck: {}. Total cards: {}",
                collectionId,
                deckId,
                reqList.size());
        CollectionEntity collection = getCollectionForCurrentUser(deckId, collectionId);

        List<CardEntity> updatedList =
                reqList.stream()
                        .map(
                                item ->
                                        updateSingleCardDifficulty(
                                                collection, item.cardId(), item.newLevel()))
                        .collect(Collectors.toList());
        cardRepository.saveAll(updatedList);
        log.info("Successfully updated difficulty for all cards in collection: {}", collectionId);
        return ApiRes.success("Updated successfully");
    }

    private CardEntity updateSingleCardDifficulty(
            CollectionEntity collection, UUID cardId, String difficultyLevel) {
        CardEntity existingCard =
                cardRepository
                        .findByIdAndCollection(cardId, collection)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        DifficultyLevel level = DifficultyLevel.fromString(difficultyLevel);
        existingCard.setDifficultyLevel(level);
        Instant nextPracticeTime = calculateNextPracticeTime(level);
        existingCard.setNextPracticeTime(nextPracticeTime);
        existingCard.setNumberOfPractice(existingCard.getNumberOfPractice() + 1);

        return existingCard;
    }

    private CardEntity toEntityFromItem(CardItemReq item) {
        return CardEntity.builder().front(item.front()).back(item.back()).build();
    }

    private CardEntity createCardEntity(CardItemReq cardItem, CollectionEntity collection) {
        CardEntity card = toEntityFromItem(cardItem);
        card.setCollection(collection);
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
                entity.getNumberOfPractice());
    }

    private CollectionEntity getCollectionForCurrentUser(UUID deckId, UUID collectionId) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        return collectionRepository
                .findByIdAndDeck(collectionId, deck)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Collection not found with id: " + collectionId));
    }

    private DeckEntity getDeckForCurrentUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        log.debug(
                "Getting deck: {} for user: {}",
                deckId,
                StringUtils.masked(currentUser.getEmail()));
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }

    /** FALLBACK METHODS FOR CIRCUIT BREAKER */

    // Fallback method for create
    public ApiRes createFallback(UUID deckId, UUID collectionId, CardReq request, Throwable t) {
        log.error("Card service unavailable during create: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for updateDifficulty
    public ApiRes updateDifficultyFallback(
            UUID deckId, UUID collectionId, List<UpdateDifficultyReq> reqList, Throwable t) {
        log.error("Card service unavailable during updateDifficulty: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for updateCard
    public ApiRes updateCardFallback(
            UUID deckId, UUID collectionId, UUID cardId, CardItemReq item, Throwable t) {
        log.error("Card service unavailable during updateCard: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getAllCardsByCollection
    public ApiRes getAllCardsByCollectionFallback(
            UUID deckId, UUID collectionId, int page, int size, Throwable t) {
        log.error("Card service unavailable during getAllCardsByCollection: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID deckId, UUID collectionId, UUID cardId, Throwable t) {
        log.error("Card service unavailable during delete: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID deckId, UUID collectionId, UUID cardId, Throwable t) {
        log.error("Card service unavailable during getById: {}", t.getMessage());
        throw new RuntimeException(
                "Card service is currently unavailable. Please try again later.", t);
    }
}
