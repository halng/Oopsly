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
import com.app.oopsly.api.repository.BaseRepository;
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
import lombok.NonNull;
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
        DeckEntity deck = getDeckForCurrentUser(deckId);

        List<CardEntity> cards =
                request.cards().stream()
                        .map(
                                cardItem -> {
                                    CardEntity card = toEntityFromItem(cardItem);
                                    card.setDeck(deck);
                                    card.setNextPracticeTime(Instant.now());
                                    return card;
                                })
                        .collect(Collectors.toList());

        List<CardEntity> savedCards = cardRepository.saveAll(cards);
        List<CardRes> responseCards =
                savedCards.stream().map(this::toCardRes).collect(Collectors.toList());

        return ApiRes.success("Created successfully", responseCards);
    }

    @Override
    public ApiRes update(UUID deckId, UUID cardId, DifficultyLevel difficultyLevel) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));

        existingCard.setDifficultyLevel(difficultyLevel);
        existingCard.setNextPracticeTime(calculateNextPracticeTime(difficultyLevel));

        cardRepository.save(existingCard);
        return ApiRes.success("Updated successfully", toCardRes(existingCard));
    }

    @Override
    public ApiRes delete(UUID deckId, UUID cardId) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        existingCard.setDeleted(true);
        cardRepository.save(existingCard);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    public ApiRes getById(UUID deckId, UUID cardId) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity card =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        return ApiRes.success("Fetched successfully", toCardRes(card));
    }

    @Override
    public ApiRes getAll(UUID deckId, int page, int size) {
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

    @Override
    public CardEntity toEntity(@NonNull CardReq from, CardEntity to) {
        if (to == null) {
            return CardEntity.builder().build();
        }
        return to;
    }

    @Override
    public CardReq toViewModel(CardEntity from) {
        return new CardReq(List.of(new CardItemReq(from.getTopic(), from.getAnswer())));
    }

    private CardEntity toEntityFromItem(CardItemReq item) {
        return CardEntity.builder().topic(item.topic()).answer(item.answer()).build();
    }

    private CardRes toCardRes(CardEntity entity) {
        return new CardRes(
                entity.getId(),
                entity.getTopic(),
                entity.getAnswer(),
                entity.getDifficultyLevel(),
                entity.getNextPracticeTime());
    }

    @Override
    public BaseRepository<CardEntity, UUID> getRepository() {
        return cardRepository;
    }

    @Override
    public User getCurrentUser() {
        return userService.getCurrentUser();
    }

    private DeckEntity getDeckForCurrentUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }
}
