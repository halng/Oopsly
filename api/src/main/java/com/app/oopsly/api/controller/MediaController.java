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

import com.app.oopsly.api.service.MediaService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.MediaUploadReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Media upload APIs for card attachments")
public class MediaController {

    private final MediaService mediaService;

    @Operation(
            summary = "Get upload URL",
            description = "Returns a pre-signed upload URL for attaching media to a card")
    @PostMapping
    public ApiRes getUploadUrl(
            @PathVariable UUID shelveId,
            @PathVariable UUID subjectId,
            @PathVariable UUID cardId,
            @Valid @RequestBody MediaUploadReq request) {
        return mediaService.getUploadUrl(
                shelveId, subjectId, cardId, request.fileName(), request.contentType());
    }
}
