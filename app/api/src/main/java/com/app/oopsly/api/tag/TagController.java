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

package com.app.oopsly.api.tag;

import com.app.oopsly.api.tag.vm.TagReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
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
}
