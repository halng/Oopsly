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

package com.app.oopsly.api.controller;

import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.UpdateDifficultyReq;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/decks/{deckId}/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PostMapping("")
    ApiRes create(@PathVariable UUID deckId, @Valid @RequestBody CardReq requestBody) {
        log.info("Creating cards for deck: {}", deckId);
        return cardService.create(deckId, requestBody);
    }

    @PatchMapping("/{id}/difficulty")
    ApiRes updateDifficulty(
            @PathVariable UUID deckId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDifficultyReq requestBody) {
        log.info(
                "Updating difficulty for card: {} in deck: {} to {}",
                id,
                deckId,
                requestBody.difficultyLevel());
        return cardService.updateDifficulty(deckId, id, requestBody.difficultyLevel());
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID deckId, @PathVariable UUID id) {
        log.info("Getting card: {} from deck: {}", id, deckId);
        return cardService.getById(deckId, id);
    }

    @DeleteMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID deckId, @PathVariable UUID id) {
        log.info("Deleting card: {} from deck: {}", id, deckId);
        return cardService.delete(deckId, id);
    }

    @GetMapping("")
    ApiRes getAll(@PathVariable UUID deckId, @RequestParam int page, @RequestParam int size) {
        log.info("Getting all cards for deck: {} with page: {} and size: {}", deckId, page, size);
        if (page < 0 || size <= 0) {
            throw new IllegalArgumentException("Page and size must be greater than 0");
        }
        return cardService.getAll(deckId, page, size);
    }
}
