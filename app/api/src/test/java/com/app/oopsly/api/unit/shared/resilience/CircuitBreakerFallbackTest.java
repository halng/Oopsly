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

package com.app.oopsly.api.unit.shared.resilience;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.card.CardServiceImpl;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shelf.ShelfServiceImpl;
import com.app.oopsly.api.stats.application.StatsServiceImpl;
import com.app.oopsly.api.subject.SubjectServiceImpl;
import com.app.oopsly.api.testsuite.application.QuestionServiceImpl;
import com.app.oopsly.api.testsuite.application.TestSuiteServiceImpl;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

/**
 * Circuit breaker fallbacks must never leak infrastructure details: domain errors keep their
 * user-facing meaning while every other failure degrades into a retry-later response.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CircuitBreakerFallbackTest {

    @InjectMocks private CardServiceImpl cardService;
    @InjectMocks private ShelfServiceImpl shelfService;
    @InjectMocks private SubjectServiceImpl subjectService;
    @InjectMocks private QuestionServiceImpl questionService;
    @InjectMocks private TestSuiteServiceImpl testSuiteService;
    @InjectMocks private StatsServiceImpl statsService;

    private static final UUID ID = UUID.randomUUID();
    private static final Throwable INFRASTRUCTURE = new IllegalStateException("database is down");

    // ------------------------------------------------------------------ card

    @Test
    void cardFallbacks_preserveDomainErrors() {
        assertThrows(
                NotFoundException.class,
                () -> cardService.getByIdFallback(ID, ID, ID, new NotFoundException("missing")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        cardService.deleteFallback(
                                ID, ID, ID, new UnauthenticatedException("no session")));
        assertThrows(
                ValidationException.class,
                () -> cardService.createFallback(ID, ID, null, new ValidationException("invalid")));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        cardService.getDueCardsFallback(
                                ID, ID, 5, new IllegalArgumentException("bad limit")));
    }

    @Test
    void cardFallbacks_degradeUnknownFailures() {
        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.getByIdFallback(ID, ID, ID, INFRASTRUCTURE));
        assertTrue(exception.getMessage().contains("Card service"));
        assertSame(INFRASTRUCTURE, exception.getCause());
    }

    // ----------------------------------------------------------------- shelf

    @Test
    void shelfFallbacks_preserveDomainErrors() {
        assertThrows(
                NotFoundException.class,
                () -> shelfService.getByIdFallback(ID, new NotFoundException("missing")));
        assertThrows(
                ValidationException.class,
                () -> shelfService.updateFallback(null, ID, new ValidationException("invalid")));
        assertThrows(
                RetryLaterException.class,
                () -> shelfService.createFallback(null, new ValidationException("invalid")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        shelfService.updateFallback(
                                null, ID, new UnauthenticatedException("no session")));
    }

    @Test
    void shelfFallbacks_degradeUnknownFailures() {
        assertThrows(
                RetryLaterException.class,
                () -> shelfService.getAllFallback(0, 10, INFRASTRUCTURE));
        assertThrows(
                RetryLaterException.class, () -> shelfService.deleteFallback(ID, INFRASTRUCTURE));
        assertThrows(
                RetryLaterException.class,
                () -> shelfService.updateFallback(null, ID, INFRASTRUCTURE));
    }

    // --------------------------------------------------------------- subject

    @Test
    void subjectFallback_degradesUnknownFailuresAndKeepsDomainErrors() {
        assertThrows(
                NotFoundException.class,
                () ->
                        subjectService.getAllByShelveFallback(
                                ID, 0, 10, new NotFoundException("missing")));
        assertThrows(
                RetryLaterException.class,
                () -> subjectService.getAllByShelveFallback(ID, 0, 10, INFRASTRUCTURE));
    }

    // -------------------------------------------------------------- question

    @Test
    void questionFallbacks_preserveDomainErrors() {
        assertThrows(
                NotFoundException.class,
                () -> questionService.getByIdFallback(ID, ID, new NotFoundException("missing")));
        assertThrows(
                ValidationException.class,
                () -> questionService.createFallback(ID, null, new ValidationException("invalid")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        questionService.deleteFallback(
                                ID, ID, new UnauthenticatedException("no session")));
    }

    @Test
    void questionFallbacks_degradeUnknownFailures() {
        assertThrows(
                RetryLaterException.class,
                () -> questionService.getAllByTestSuiteFallback(ID, INFRASTRUCTURE));
        assertThrows(
                RetryLaterException.class,
                () -> questionService.updateFallback(ID, ID, null, INFRASTRUCTURE));
    }

    // ------------------------------------------------------------ test suite

    @Test
    void testSuiteFallbacks_preserveDomainErrors() {
        assertThrows(
                NotFoundException.class,
                () -> testSuiteService.createFallback(ID, null, new NotFoundException("missing")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        testSuiteService.getByIdFallback(
                                ID, ID, new UnauthenticatedException("no session")));
    }

    @Test
    void testSuiteFallbacks_degradeUnknownFailures() {
        assertThrows(
                RetryLaterException.class,
                () -> testSuiteService.updateFallback(ID, ID, null, INFRASTRUCTURE));
        assertThrows(
                RetryLaterException.class,
                () -> testSuiteService.deleteFallback(ID, ID, INFRASTRUCTURE));
        assertThrows(
                RetryLaterException.class,
                () -> testSuiteService.getAllByShelveFallback(ID, INFRASTRUCTURE));
    }

    // ----------------------------------------------------------------- stats

    @Test
    void statsFallback_rethrowsDomainErrorsAndDegradesTheRest() throws Exception {
        Method method = StatsServiceImpl.class.getDeclaredMethod("statsFallback", Throwable.class);
        method.setAccessible(true);

        assertThrows(
                ValidationException.class,
                () -> invoke(method, statsService, new ValidationException("invalid")));
        assertThrows(
                NotFoundException.class,
                () -> invoke(method, statsService, new NotFoundException("missing")));

        ApiRes response = (ApiRes) invoke(method, statsService, INFRASTRUCTURE);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertFalse(response.getBody().isSuccess());
    }

    private static Object invoke(Method method, Object target, Object... args) throws Exception {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }
}
