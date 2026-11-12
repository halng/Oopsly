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

package com.app.quizi.api.subject;

import com.app.quizi.api.shared.application.vm.ApiRes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/decks")
@RequiredArgsConstructor
@Tag(name = "Public decks", description = "Unauthenticated read access to public decks for SEO")
public class PublicDeckController {

    private final PublicDeckService service;

    @Operation(summary = "List public decks", description = "Public decks that have cards")
    @GetMapping
    public ApiRes list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return service.list(page, size);
    }

    @Operation(
            summary = "Get a public deck",
            description = "A public deck with a preview of its cards")
    @GetMapping("/{id}")
    public ApiRes getById(@PathVariable UUID id) {
        return service.getById(id);
    }
}
