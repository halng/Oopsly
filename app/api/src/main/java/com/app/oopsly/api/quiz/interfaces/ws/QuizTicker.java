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

package com.app.oopsly.api.quiz.interfaces.ws;

import com.app.oopsly.api.quiz.application.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Closes questions and advances automatic rooms when their timers elapse. */
@Component
@RequiredArgsConstructor
public class QuizTicker {

    private final QuizService quizService;

    @Scheduled(fixedDelayString = "${app.quiz.tick-millis:500}")
    public void tick() {
        quizService.tick();
    }
}
