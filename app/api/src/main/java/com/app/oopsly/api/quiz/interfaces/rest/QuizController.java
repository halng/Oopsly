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

package com.app.oopsly.api.quiz.interfaces.rest;

import com.app.oopsly.api.quiz.application.QuizService;
import com.app.oopsly.api.quiz.application.vm.CreateRoomReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.util.ApiMessages;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/quiz/rooms")
@RequiredArgsConstructor
@Tag(name = "Quiz", description = "Host a test suite as a live, Kahoot style room")
public class QuizController {

    private final QuizService quizService;

    @Operation(
            summary = "Create a live room",
            description =
                    "Hosts a test suite. The room holds 20, 50 or 100 players depending on the"
                            + " host's subscription plan. Players then join over the websocket.")
    @PostMapping
    public ApiRes create(@Valid @RequestBody CreateRoomReq request) {
        return ApiRes.created(ApiMessages.QUIZ_CREATED, quizService.createRoom(request));
    }
}
