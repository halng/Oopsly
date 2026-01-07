/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.entity.CardEntity;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.CardRepository;
import com.app.osmosis.api.service.SpacedRepetitionService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpacedRepetitionServiceImpl implements SpacedRepetitionService {

    private final CardRepository cardRepository;

    @Override
    public Optional<CardEntity> findNextDueCard(UUID deckId) {
        return cardRepository.findTopByDeck_IdAndDueAtLessThanEqualOrderByDueAtAsc(
                deckId, Instant.now());
    }

    @Override
    public CardEntity recordReview(UUID cardId, boolean correct) {
        CardEntity card =
                cardRepository
                        .findById(cardId)
                        .orElseThrow(() -> new NotFoundException("Card not found for review"));
        card.scheduleNext(correct);
        CardEntity saved = cardRepository.save(card);
        log.debug("Card {} rescheduled to {} (interval {} minutes)",
                saved.getId(), saved.getDueAt(), saved.getIntervalMinutes());
        return saved;
    }
}
