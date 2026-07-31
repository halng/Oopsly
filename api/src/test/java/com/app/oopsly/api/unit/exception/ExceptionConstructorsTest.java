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

package com.app.oopsly.api.unit.exception;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.exception.AuthProviderException;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.SendEmailException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import org.junit.jupiter.api.Test;

class ExceptionConstructorsTest {

    @Test
    void constructsAllExceptionVariants() {
        assertEquals("a", new RetryLaterException("a").getMessage());
        assertEquals("b", new RetryLaterException("b", new RuntimeException()).getMessage());
        assertEquals("c", new AuthProviderException("c").getMessage());
        assertEquals("d", new AuthProviderException("d", new RuntimeException()).getMessage());
        assertEquals("e", new UnauthenticatedException("e").getMessage());
        assertEquals("f", new UnauthenticatedException("f", new RuntimeException()).getMessage());
        assertEquals("g", new ValidationException("g").getMessage());
        assertEquals("h", new NotFoundException("h").getMessage());
        assertEquals("i", new SendEmailException("i").getMessage());
    }
}
