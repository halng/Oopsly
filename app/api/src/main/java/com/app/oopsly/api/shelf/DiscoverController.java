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

package com.app.oopsly.api.shelf;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.application.vm.CloneReq;
import com.app.oopsly.api.subject.SubjectService;
import com.app.oopsly.api.testsuite.application.TestSuiteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/discover")
@RequiredArgsConstructor
@Tag(name = "Discover", description = "Public deck and test suite discovery and cloning APIs")
public class DiscoverController {

    private final SubjectService subjectService;
    private final TestSuiteService testSuiteService;

    @Operation(
            summary = "Discover public decks",
            description = "Search public decks by name or description")
    @GetMapping
    public ApiRes discoverPublicDecks(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return subjectService.discoverPublicDecks(q, page, size);
    }

    @Operation(
            summary = "Clone a public deck",
            description =
                    "Clones a public deck into the given shelf, or the current user's first shelf")
    @PostMapping("/{subjectId}/clone")
    public ApiRes cloneDeck(
            @PathVariable UUID subjectId, @RequestBody(required = false) CloneReq body) {
        return subjectService.cloneDeck(subjectId, body == null ? null : body.shelfId());
    }

    @Operation(
            summary = "Discover public test suites",
            description = "Search public test suites by title or description")
    @GetMapping("/test-suites")
    public ApiRes discoverPublicTestSuites(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return testSuiteService.discoverPublic(q, page, size);
    }

    @Operation(
            summary = "Clone a public test suite",
            description =
                    "Clones a public test suite with its questions into the given shelf, or the"
                            + " current user's first shelf")
    @PostMapping("/test-suites/{testSuiteId}/clone")
    public ApiRes cloneTestSuite(
            @PathVariable UUID testSuiteId, @RequestBody(required = false) CloneReq body) {
        return testSuiteService.cloneSuite(testSuiteId, body == null ? null : body.shelfId());
    }
}
