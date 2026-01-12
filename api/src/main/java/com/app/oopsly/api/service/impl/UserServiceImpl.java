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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.UserService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
    }

    @Cacheable(value = "users", key = "#root.methodName + ':' + #root.target.getCurrentUserId()")
    @CircuitBreaker(name = "userServiceCircuitBreaker", fallbackMethod = "getCurrentUserFallback")
    @Override
    public User getCurrentUser() {
        String currentUserId = getCurrentUserId();
        return userRepository
                .findById(UUID.fromString(currentUserId))
                .orElseThrow(() -> new UnauthenticatedException("User not found"));
    }

    // Fallback method for Circuit Breaker
    public User getCurrentUserFallback(Throwable t) {
        throw new UnauthenticatedException(
                "User service is currently unavailable. Please try again later.", t);
    }
}
