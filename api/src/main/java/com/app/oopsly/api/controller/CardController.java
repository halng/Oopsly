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

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardReq;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/decks/{deckId}/cards")
public class CardController extends AbstractController<CardEntity, CardReq> {

    private final CardService cardService;

    public CardController(CardService cardService) {
        super(cardService);
        this.cardService = cardService;
    }

    @PostMapping("")
    ApiRes create(@PathVariable UUID deckId, @Valid @RequestBody CardReq requestBody) {
        return cardService.create(deckId, requestBody);
    }

    @PutMapping("/{id}")
    ApiRes update(
            @PathVariable UUID deckId,
            @Valid @RequestBody CardReq requestBody,
            @PathVariable UUID id) {
        return cardService.update(deckId, id, requestBody);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID deckId, @PathVariable UUID id) {
        return cardService.getById(deckId, id);
    }

    @PatchMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID deckId, @PathVariable UUID id) {
        return cardService.delete(deckId, id);
    }

    @GetMapping("")
    ApiRes getAll(@PathVariable UUID deckId, @RequestParam int page, @RequestParam int size) {
        if (page < 0 || size <= 0) {
            throw new IllegalArgumentException("Page and size must be greater than 0");
        }
        return cardService.getAll(deckId, page, size);
    }
}
