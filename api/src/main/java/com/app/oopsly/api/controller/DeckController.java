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

import com.app.oopsly.api.service.DeckService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/decks")
public class DeckController {
    private final DeckService service;

    public DeckController(DeckService service) {
        this.service = service;
    }

    @PostMapping("")
    ApiRes create(@Valid @RequestBody DeckReq requestBody) {
        return this.service.create(requestBody);
    }

    @PutMapping("/{id}")
    ApiRes update(@Valid @RequestBody DeckReq requestBody, @PathVariable UUID id) {
        return this.service.update(requestBody, id);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID id) {
        return this.service.getById(id);
    }

    @PatchMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID id) {
        return this.service.delete(id);
    }

    @GetMapping("")
    ApiRes getAll(@RequestParam int page, @RequestParam int size) {
        if (page <= 0 || size <= 0) {
            throw new IllegalArgumentException("Page and size must be greater than 0");
        }
        return this.service.getAll(page - 1, size);
    }
}
