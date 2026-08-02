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

import com.app.oopsly.api.service.TagService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TagReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Tag", description = "Tag management APIs for organising cards")
public class TagController {

    private final TagService tagService;

    @Operation(summary = "Create tag", description = "Creates a new tag for the current user")
    @PostMapping("/tags")
    public ApiRes createTag(@Valid @RequestBody TagReq request) {
        return tagService.createTag(request.name());
    }

    @Operation(summary = "Get all tags", description = "Returns all tags owned by the current user")
    @GetMapping("/tags")
    public ApiRes getAllTags() {
        return tagService.getAllTags();
    }

    @Operation(summary = "Delete tag", description = "Soft deletes a tag owned by the current user")
    @PatchMapping("/tags/{id}")
    public ApiRes deleteTag(@PathVariable UUID id) {
        return tagService.deleteTag(id);
    }

    @Operation(summary = "Add tag to card", description = "Links a tag to a specific card")
    @PostMapping("/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/tags/{tagId}")
    public ApiRes addTagToCard(
            @PathVariable UUID shelveId,
            @PathVariable UUID subjectId,
            @PathVariable UUID cardId,
            @PathVariable UUID tagId) {
        return tagService.addTagToCard(shelveId, subjectId, cardId, tagId);
    }

    @Operation(
            summary = "Remove tag from card",
            description = "Removes a tag from a specific card (join table operation)")
    @DeleteMapping("/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/tags/{tagId}")
    public ApiRes removeTagFromCard(
            @PathVariable UUID shelveId,
            @PathVariable UUID subjectId,
            @PathVariable UUID cardId,
            @PathVariable UUID tagId) {
        return tagService.removeTagFromCard(shelveId, subjectId, cardId, tagId);
    }

    @Operation(
            summary = "Get cards by tag",
            description = "Returns all cards in a subject that have the given tag")
    @GetMapping("/shelves/{shelveId}/subjects/{subjectId}/cards/by-tag/{tagId}")
    public ApiRes getCardsByTag(
            @PathVariable UUID shelveId, @PathVariable UUID subjectId, @PathVariable UUID tagId) {
        return tagService.getCardsByTag(shelveId, subjectId, tagId);
    }
}
