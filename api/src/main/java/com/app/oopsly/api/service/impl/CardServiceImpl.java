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
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.CardRes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
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
    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    public ApiRes create(UUID deckId, CardReq request) {
        log.info("Creating {} cards for deck: {}", request.cards().size(), deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);

        List<CardEntity> cards =
                request.cards().stream()
                        .map(cardItem -> createCardEntity(cardItem, deck))
                        .collect(Collectors.toList());

        List<CardEntity> savedCards = cardRepository.saveAll(cards);
        log.info("Successfully created {} cards for deck: {}", savedCards.size(), deckId);
        List<CardRes> responseCards =
                savedCards.stream().map(this::toCardRes).collect(Collectors.toList());

        return ApiRes.success("Created successfully", responseCards);
    }

    @Override
    public ApiRes updateDifficulty(UUID deckId, UUID cardId, DifficultyLevel difficultyLevel) {
        log.info(
                "Updating difficulty for card: {} in deck: {} to {}",
                cardId,
                deckId,
                difficultyLevel);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        existingCard.setDifficultyLevel(difficultyLevel);
        Instant nextPracticeTime = calculateNextPracticeTime(difficultyLevel);
        existingCard.setNextPracticeTime(nextPracticeTime);
        existingCard.setNumberOfPractice(existingCard.getNumberOfPractice() + 1);

        cardRepository.save(existingCard);
        log.info("Successfully updated difficulty for card: {}", cardId);
        return ApiRes.success("Updated successfully", toCardRes(existingCard));
    }

    @Override
    public ApiRes delete(UUID deckId, UUID cardId) {
        log.info("Deleting card: {} from deck: {}", cardId, deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        existingCard.setDeleted(true);
        cardRepository.save(existingCard);
        log.info("Successfully deleted card: {}", cardId);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    public ApiRes getById(UUID deckId, UUID cardId) {
        log.info("Getting card: {} from deck: {}", cardId, deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity card =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        log.info("Successfully retrieved card: {}", cardId);
        return ApiRes.success("Fetched successfully", toCardRes(card));
    }

    @Override
    public ApiRes getAll(UUID deckId, int page, int size) {
        log.info("Getting all cards for deck: {} with page: {} and size: {}", deckId, page, size);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        Pageable pageable = PageRequest.of(page, size);
        Page<CardEntity> pageData = cardRepository.findAllByDeck(deck, pageable);
        List<CardRes> cards =
                pageData.getContent().stream().map(this::toCardRes).collect(Collectors.toList());

        HashMap<String, Object> response = new HashMap<>();
        response.put("entities", cards);
        response.put("currentPage", pageable.getPageNumber());
        response.put("totalItems", pageData.getTotalElements());
        response.put("totalPages", pageData.getTotalPages());
        response.put("hasNextPage", pageData.hasNext());
        log.info(
                "Successfully retrieved {} cards for deck: {} (total: {})",
                cards.size(),
                deckId,
                pageData.getTotalElements());
        return ApiRes.success("Fetched successfully", response);
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

    private CardEntity toEntityFromItem(CardItemReq item) {
        return CardEntity.builder().topic(item.topic()).answer(item.answer()).build();
    }

    private CardEntity createCardEntity(CardItemReq cardItem, DeckEntity deck) {
        CardEntity card = toEntityFromItem(cardItem);
        card.setDeck(deck);
        card.setNextPracticeTime(Instant.now());
        return card;
    }

    private CardRes toCardRes(CardEntity entity) {
        return new CardRes(
                entity.getId(),
                entity.getTopic(),
                entity.getAnswer(),
                entity.getDifficultyLevel(),
                entity.getNextPracticeTime(),
                entity.getNumberOfPractice());
    }

    private DeckEntity getDeckForCurrentUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        log.debug("Getting deck: {} for user: {}", deckId, currentUser.getEmail());
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }
}
