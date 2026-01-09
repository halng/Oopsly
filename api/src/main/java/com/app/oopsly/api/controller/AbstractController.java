package com.app.oopsly.api.controller;

import com.app.oopsly.api.service.Service;
import com.app.oopsly.api.viewmodel.ApiRes;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
public abstract class AbstractController<T, S> {
    private final Service<T, S> service;

    public AbstractController(Service service) {
        this.service = service;
    }

    // deepcode ignore SpringCsrfProtection: This is a stateless JWT-based REST API.
    // CSRF protection is not applicable as authentication uses Bearer tokens in headers,
    // not session cookies. Each request requires a valid JWT token in the Authorization header.
    @PostMapping("")
    ApiRes create(@Valid @RequestBody S requestBody) {
        return this.service.create(requestBody);
    }

    // deepcode ignore SpringCsrfProtection: This is a stateless JWT-based REST API.
    // CSRF protection is not applicable as authentication uses Bearer tokens in headers,
    // not session cookies. Each request requires a valid JWT token in the Authorization header.
    @PutMapping("/{id}")
    ApiRes update(@Valid @RequestBody S requestBody, @PathVariable UUID id) {
        return this.service.update(requestBody, id);
    }

    @GetMapping("/{id}")
    ApiRes getById(@PathVariable UUID id) {
        return this.service.getById(id);
    }

    @PatchMapping("/{id}")
    ApiRes deleteById(@PathVariable UUID id) {
        return this.service.delete(id);
    }

    @GetMapping("")
    ApiRes getAll(@RequestParam int page, @RequestParam int size) {
        if (page < 0 || size <= 0) {
            throw new IllegalArgumentException("Page and size must be greater than 0");
        }
        return this.service.getAll(page, size);
    }
}
