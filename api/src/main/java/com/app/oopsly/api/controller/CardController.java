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
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/decks/{deckId}/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PostMapping("")
    ApiRes create(@PathVariable UUID deckId, @Valid @RequestBody CardReq requestBody) {
        return cardService.create(deckId, requestBody);
    }

    @PutMapping("/{cardId}")
    ApiRes update(
            @PathVariable UUID deckId,
            @PathVariable UUID cardId,
            @Valid @RequestBody CardReq requestBody) {
        return cardService.update(deckId, cardId, requestBody);
    }

    @GetMapping("/{cardId}")
    ApiRes getById(@PathVariable UUID deckId, @PathVariable UUID cardId) {
        return cardService.getById(deckId, cardId);
    }

    @PatchMapping("/{cardId}")
    ApiRes deleteById(@PathVariable UUID deckId, @PathVariable UUID cardId) {
        return cardService.delete(deckId, cardId);
    }

    @GetMapping("")
    ApiRes getAll(@PathVariable UUID deckId, @RequestParam int page, @RequestParam int size) {
        if (page < 0 || size <= 0) {
            throw new IllegalArgumentException("Page and size must be greater than 0");
        }
        return cardService.getAll(deckId, page, size);
    }
}
