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

import com.app.osmosis.api.service.Service;
import com.app.osmosis.api.viewmodel.ApiRes;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
public abstract class AbstractController<T> {
    private final Service service;

    public AbstractController(Service service) {
        this.service = service;
    }

    @PostMapping("")
    ApiRes create(@Valid @RequestBody T requestBody) {
        return this.service.create(requestBody);
    }

    @PutMapping("/{id}")
    ApiRes update(@Valid @RequestBody T requestBody, @PathVariable String id) {
        return this.service.update(requestBody, id);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable String id) {
        return this.service.getById(id);
    }

    @PatchMapping("/{id}")
    ApiRes deleteById(@PathVariable String id) {
        return this.service.delete(id);
    }

    @GetMapping("")
    ApiRes getAll(@RequestParam int page, @RequestParam int size) {
        return this.service.getAll(page, size);
    }
}
