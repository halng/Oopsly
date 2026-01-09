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
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardReq;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
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
        CardEntity card = toEntity(request, null);
        card.setDeck(deck);
        CardEntity savedCard = cardRepository.save(card);
        return ApiRes.success("Created successfully", toViewModel(savedCard));
    }

    @Override
    public ApiRes update(UUID deckId, UUID cardId, CardReq request) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CardEntity existingCard =
                cardRepository
                        .findByIdAndDeck(cardId, deck)
                        .orElseThrow(
                                () -> new NotFoundException("Card not found with id: " + cardId));
        CardEntity updatedCard = toEntity(request, existingCard);
        cardRepository.save(updatedCard);
        return ApiRes.success("Updated successfully");
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
        return ApiRes.success("Fetched successfully", card);
    }

    @Override
    public ApiRes getAll(UUID deckId, int page, int size) {
        DeckEntity deck = getDeckForCurrentUser(deckId);
        Pageable pageable = PageRequest.of(page, size);
        Page<CardEntity> pageData = cardRepository.findAllByDeck(deck, pageable);
        List<CardEntity> cards = pageData.getContent();

        HashMap<String, Object> response = new HashMap<>();
        response.put("entities", cards);
        response.put("currentPage", pageable.getPageNumber());
        response.put("totalItems", pageData.getTotalElements());
        response.put("totalPages", pageData.getTotalPages());
        response.put("hasNextPage", pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    @Override
    public CardEntity toEntity(@NonNull CardReq from, CardEntity to) {
        if (to == null) {
            return CardEntity.builder()
                    .topic(from.topic())
                    .answer(from.answer())
                    .difficultyLevel(from.difficultyLevel())
                    .nextPracticeTime(from.nextPracticeTime())
                    .build();
        }

        to.setTopic(from.topic());
        to.setAnswer(from.answer());
        to.setDifficultyLevel(from.difficultyLevel());
        to.setNextPracticeTime(from.nextPracticeTime());
        return to;
    }

    @Override
    public CardReq toViewModel(CardEntity from) {
        return new CardReq(
                from.getTopic(),
                from.getAnswer(),
                from.getDifficultyLevel(),
                from.getNextPracticeTime());
    }

    private DeckEntity getDeckForCurrentUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }
}
