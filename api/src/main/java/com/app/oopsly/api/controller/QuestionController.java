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

import com.app.oopsly.api.service.QuestionService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test-suites/{testSuiteId}/questions")
public class QuestionController {
    private final QuestionService service;

    public QuestionController(QuestionService service) {
        this.service = service;
    }

    @PostMapping("")
    ApiRes create(@PathVariable UUID testSuiteId, @Valid @RequestBody QuestionReq requestBody) {
        return this.service.create(testSuiteId, requestBody);
    }

    @PutMapping("/{id}")
    ApiRes update(
            @PathVariable UUID testSuiteId,
            @PathVariable UUID id,
            @Valid @RequestBody QuestionReq requestBody) {
        return this.service.update(testSuiteId, id, requestBody);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID testSuiteId, @PathVariable UUID id) {
        return this.service.getById(testSuiteId, id);
    }

    @DeleteMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID testSuiteId, @PathVariable UUID id) {
        return this.service.delete(testSuiteId, id);
    }

    @GetMapping("")
    ApiRes getAllByTestSuite(@PathVariable UUID testSuiteId) {
        return this.service.getAllByTestSuite(testSuiteId);
    }
}
