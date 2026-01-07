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

import com.app.osmosis.api.service.OsmosisTutorService;
import com.app.osmosis.api.viewmodel.ApiRes;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(path = "/tutor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public class VoiceTutorController {

    private final OsmosisTutorService osmosisTutorService;

    @PostMapping(path = "/voice", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiRes handleVoiceTurn(
            @RequestParam("deckId") UUID deckId,
            @RequestParam(value = "sessionId", required = false) UUID sessionId,
            @RequestPart(value = "audio", required = false) MultipartFile audio,
            @RequestParam(value = "text", required = false) String text)
            throws IOException {

        log.info("Incoming voice tutor request for deck {} session {}", deckId, sessionId);
        var response = osmosisTutorService.handleVoiceTurn(deckId, sessionId, audio, text);
        return ApiRes.ok("Tutor turn completed", response);
    }
}
