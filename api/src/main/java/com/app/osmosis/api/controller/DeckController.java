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

package com.app.osmosis.api.controller;

import com.app.osmosis.api.service.DeckService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.DeckReq;
import com.app.osmosis.api.viewmodel.UpdateDeckReq;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/decks")
public class DeckController {

    private final DeckService deckService;

    public DeckController(DeckService deckService) {
        this.deckService = deckService;
    }

    @PostMapping
    public ApiRes createDeck(@Valid @RequestBody DeckReq deckReq) {
        return deckService.createDeck(deckReq);
    }

    @GetMapping
    public ApiRes getAllDecks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return deckService.getAllDecks(pageable);
    }

    @GetMapping("/{id}")
    public ApiRes getDeckById(@PathVariable UUID id) {
        return deckService.getDeckById(id);
    }

    @PutMapping("/{id}")
    public ApiRes updateDeck(
            @PathVariable UUID id, @Valid @RequestBody UpdateDeckReq updateDeckReq) {
        return deckService.updateDeck(id, updateDeckReq);
    }

    @PatchMapping("/{id}")
    public ApiRes softDeleteDeck(@PathVariable UUID id) {
        return deckService.softDeleteDeck(id);
    }
}
