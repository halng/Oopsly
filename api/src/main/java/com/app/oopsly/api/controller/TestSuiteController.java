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

import com.app.oopsly.api.service.TestSuiteService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/decks/{deckId}/test-suites")
public class TestSuiteController {
    private final TestSuiteService service;

    public TestSuiteController(TestSuiteService service) {
        this.service = service;
    }

    @PostMapping("")
    ApiRes create(@PathVariable UUID deckId, @Valid @RequestBody TestSuiteReq requestBody) {
        return this.service.create(deckId, requestBody);
    }

    @PutMapping("/{id}")
    ApiRes update(
            @PathVariable UUID deckId,
            @PathVariable UUID id,
            @Valid @RequestBody TestSuiteReq requestBody) {
        return this.service.update(deckId, id, requestBody);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID deckId, @PathVariable UUID id) {
        return this.service.getById(deckId, id);
    }

    @DeleteMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID deckId, @PathVariable UUID id) {
        return this.service.delete(deckId, id);
    }

    @GetMapping("")
    ApiRes getAllByDeck(@PathVariable UUID deckId) {
        return this.service.getAllByDeck(deckId);
    }
}
