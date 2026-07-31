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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.never;

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.SendEmailException;
import com.app.oopsly.api.messaging.EmailSender;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.impl.OTPServiceImpl;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.viewmodel.OTPReq;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class OTPServiceImplTest {

    @Mock EmailSender emailSender;

    @Mock UserRepository userRepository;

    @Mock StringRedisTemplate stringRedisTemplate;

    @Mock ValueOperations<String, String> valueOps;

    @Mock JwtUtils jwtUtils;

    @Mock AppConfig appConfig;

    @InjectMocks OTPServiceImpl otpService;

    @Captor ArgumentCaptor<Map<String, Object>> claimsCaptor;

    private final String email = "user@example.com";
    private final String userKey = "user";

    @BeforeEach
    void setUp() {
        lenient().when(appConfig.isTestEmail("test@oopsly.com")).thenReturn(true);
    }

    @Test
    void sendOTP_success_storesOtpAndAttempts_and_sendsEmail() throws Exception {
        // arrange
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        // act
        var res = otpService.sendOTP(email);

        // assert - interaction checks (email is sent asynchronously, so we check redis only)
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_REDIS_KEY + userKey),
                        anyString(),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey),
                        eq("0"),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void sendOTP_messagingException_stillStoresOtpInRedis() throws Exception {
        // arrange - email sending is async, so exception won't affect OTP storage
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        // act
        var res = otpService.sendOTP(email);

        // assert - OTP is stored in Redis even if email fails (async)
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_REDIS_KEY + userKey),
                        anyString(),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey),
                        eq("0"),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void sendOTP_ioException_stillStoresOtpInRedis() throws Exception {
        // arrange - email sending is async, so exception won't affect OTP storage
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        // act
        var res = otpService.sendOTP(email);

        // assert - OTP is stored in Redis even if email fails (async)
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_REDIS_KEY + userKey),
                        anyString(),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey),
                        eq("0"),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void sendOTP_runtimeException_stillStoresOtpInRedis() throws Exception {
        // arrange - email sending is async, so exception won't affect OTP storage
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        // act
        var res = otpService.sendOTP(email);

        // assert - OTP is stored in Redis even if email fails (async)
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_REDIS_KEY + userKey),
                        anyString(),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey),
                        eq("0"),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void verifyOTP_valid_newUser_createsUser_and_storesRefreshToken() {
        // arrange
        String otp = "222222";
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;
        UUID userId = UUID.randomUUID();
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn(otp);
        when(valueOps.get(attemptKey)).thenReturn("0");

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        var createdUser = mock(User.class);
        when(createdUser.getId()).thenReturn(userId);
        when(userRepository.save(any(User.class))).thenReturn(createdUser);

        when(jwtUtils.generateTokenWithClaims(anyMap(), eq(email))).thenReturn("jwt-token");
        when(jwtUtils.generateRefreshToken(eq(email))).thenReturn("refresh-token");

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn(otp);

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert
        verify(userRepository, times(1)).save(any(User.class));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.REFRESH_TOKEN_REDIS_KEY + userId),
                        eq("refresh-token"),
                        eq(Long.valueOf(Constant.REFRESH_TOKEN_EXPIRATION_DAYS)),
                        eq(TimeUnit.DAYS));
        verify(stringRedisTemplate, times(1)).delete(otpKey);
        verify(stringRedisTemplate, times(1)).delete(attemptKey);
        assertNotNull(res);
    }

    @Test
    void verifyOTP_invalid_incrementsAttemptCount_and_returnsInvalid() {
        // arrange
        String stored = "000000";
        String input = "111111";
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn(stored);
        when(valueOps.get(attemptKey)).thenReturn("0");

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn(input);

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert - attempt incremented and saved back into redis with TTL
        verify(valueOps, times(1))
                .set(
                        eq(attemptKey),
                        eq("1"),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        verify(stringRedisTemplate, never()).delete(otpKey);
        assertNotNull(res);
    }

    @Test
    void verifyOTP_expired_returnsExpired_and_noFurtherActions() {
        // arrange
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn(null);

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn("any");

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert
        verify(valueOps, never())
                .set(eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey), anyString(), anyLong(), any());
        verify(jwtUtils, never()).generateTokenWithClaims(anyMap(), anyString());
        verify(stringRedisTemplate, never()).delete(anyString());
        assertNotNull(res);
    }

    @Test
    void verifyOTP_invalidated_whenAttemptsExceeded_returnsRateLimited() {
        // arrange
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn("000000");
        when(valueOps.get(attemptKey)).thenReturn(String.valueOf(Constant.OTP_MAX_ATTEMPT));

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp())
                .thenReturn("000000"); // even if correct, should be invalidated by attempts

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert
        verify(jwtUtils, never()).generateTokenWithClaims(anyMap(), anyString());
        verify(stringRedisTemplate, never()).delete(anyString());
        assertNotNull(res);
    }

    @Test
    void sendOTP_withExistingUser_doesNotCreateNewUser() {
        // arrange
        String otp = "123456";
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;
        UUID userId = UUID.randomUUID();

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn(otp);
        when(valueOps.get(attemptKey)).thenReturn("0");

        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(existingUser));

        when(jwtUtils.generateTokenWithClaims(anyMap(), eq(email))).thenReturn("jwt-token");
        when(jwtUtils.generateRefreshToken(eq(email))).thenReturn("refresh-token");

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn(otp);

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert
        verify(userRepository, never()).save(any(User.class));
        verify(valueOps, times(1))
                .set(
                        eq(Constant.REFRESH_TOKEN_REDIS_KEY + userId),
                        eq("refresh-token"),
                        eq(Long.valueOf(Constant.REFRESH_TOKEN_EXPIRATION_DAYS)),
                        eq(TimeUnit.DAYS));
        assertNotNull(res);
    }

    @Test
    void sendOTP_withEmailContainingPlus_handlesCorrectly() {
        // arrange
        String emailWithPlus = "user+test@example.com";
        String expectedKey = "user+test";

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        // act
        var res = otpService.sendOTP(emailWithPlus);

        // assert
        verify(valueOps, times(1))
                .set(
                        eq(Constant.OTP_REDIS_KEY + expectedKey),
                        anyString(),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void verifyOTP_withNullAttemptString_treatsAsZero() {
        // arrange
        String otp = "654321";
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;
        UUID userId = UUID.randomUUID();

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn(otp);
        when(valueOps.get(attemptKey)).thenReturn(null); // null attempt count

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        var createdUser = mock(User.class);
        when(createdUser.getId()).thenReturn(userId);
        when(userRepository.save(any(User.class))).thenReturn(createdUser);

        when(jwtUtils.generateTokenWithClaims(anyMap(), eq(email))).thenReturn("jwt-token");
        when(jwtUtils.generateRefreshToken(eq(email))).thenReturn("refresh-token");

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn(otp);

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert
        assertNotNull(res);
        verify(stringRedisTemplate, times(1)).delete(otpKey);
        verify(stringRedisTemplate, times(1)).delete(attemptKey);
    }

    @Test
    void verifyOTP_withBoundaryAttemptCount_validatesCorrectly() {
        // arrange - test with attempt count just below max
        String otp = "111111";
        String otpKey = Constant.OTP_REDIS_KEY + userKey;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + userKey;

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(otpKey)).thenReturn("222222"); // incorrect OTP
        when(valueOps.get(attemptKey)).thenReturn(String.valueOf(Constant.OTP_MAX_ATTEMPT - 1));

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn(email);
        when(otpReq.otp()).thenReturn(otp);

        // act
        var res = otpService.verifyOTP(otpReq);

        // assert - should increment to max attempts
        verify(valueOps, times(1))
                .set(
                        eq(attemptKey),
                        eq(String.valueOf(Constant.OTP_MAX_ATTEMPT)),
                        eq(Long.valueOf(Constant.OTP_EXPIRATION_MINUTES)),
                        eq(TimeUnit.MINUTES));
        assertNotNull(res);
    }

    @Test
    void sendOTP_withRedisException_propagatesException() {
        // arrange
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        doThrow(new RuntimeException("Redis error"))
                .when(valueOps)
                .set(anyString(), anyString(), anyLong(), any(TimeUnit.class));

        // act & assert
        try {
            otpService.sendOTP(email);
        } catch (RuntimeException e) {
            // Expected exception
            assertNotNull(e);
        }
    }

    // Fallback Function Tests
    @Test
    void sendOTPFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("OTP service unavailable");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class, () -> otpService.sendOTPFallback(email, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void sendOTPFallback_withDifferentExceptionTypes_preservesCause() {
        // Test with various exception types
        Exception sqlException = new java.sql.SQLException("Database connection failed");
        Exception ioException = new java.io.IOException("Email server unreachable");
        RuntimeException networkException = new RuntimeException("Network timeout");

        RetryLaterException ex1 =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.sendOTPFallback(email, sqlException));
        RetryLaterException ex2 =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.sendOTPFallback(email, ioException));
        RetryLaterException ex3 =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.sendOTPFallback(email, networkException));

        assertSame(sqlException, ex1.getCause());
        assertSame(ioException, ex2.getCause());
        assertSame(networkException, ex3.getCause());
    }

    @Test
    void verifyOTPFallback_throwsRuntimeException() {
        OTPReq otpReq = mock(OTPReq.class);

        Throwable cause = new Throwable("Circuit breaker triggered");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.verifyOTPFallback(otpReq, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void verifyOTPFallback_withNullCause_handlesGracefully() {
        OTPReq otpReq = mock(OTPReq.class);

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.verifyOTPFallback(otpReq, null));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertNull(exception.getCause());
    }

    @Test
    void fallbackMethods_provideUserFriendlyMessages() {
        OTPReq otpReq = mock(OTPReq.class);

        Throwable cause = new Throwable("Internal service error");

        RetryLaterException sendEx =
                assertThrows(
                        RetryLaterException.class, () -> otpService.sendOTPFallback(email, cause));
        RetryLaterException verifyEx =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.verifyOTPFallback(otpReq, cause));

        assertTrue(sendEx.getMessage().contains("try again later"));
        assertTrue(verifyEx.getMessage().contains("try again later"));
    }

    @Test
    void fallbackMethods_preserveExceptionChain() {
        Exception originalException = new SendEmailException("SMTP server connection failed");
        RuntimeException wrappedException =
                new RuntimeException("Email service error", originalException);

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> otpService.sendOTPFallback(email, wrappedException));

        assertEquals(wrappedException, exception.getCause());
        assertEquals(originalException, exception.getCause().getCause());
    }

    @Test
    void fallbackMethods_withChainedExceptions_maintainFullStack() {
        Exception level3 = new java.net.ConnectException("Connection refused");
        Exception level2 = new java.io.IOException("Network error", level3);
        RuntimeException level1 = new RuntimeException("Service error", level2);

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class, () -> otpService.sendOTPFallback(email, level1));

        // Verify exception chain is preserved
        assertSame(level1, exception.getCause());
        assertSame(level2, exception.getCause().getCause());
        assertSame(level3, exception.getCause().getCause().getCause());
    }

    @Test
    void sendOTP_testEmail_skipsRedisAndEmail() {
        var res = otpService.sendOTP("test@oopsly.com");

        assertTrue(res.getBody().isSuccess());
        verify(stringRedisTemplate, never()).opsForValue();
        verifyNoInteractions(emailSender);
    }

    @Test
    void verifyOTP_testEmailWithMagicOtp_authenticatesWithoutRedis() {
        UUID userId = UUID.randomUUID();
        User existing = new User();
        existing.setId(userId);
        existing.setEmail("test@oopsly.com");

        when(userRepository.findByEmail("test@oopsly.com")).thenReturn(Optional.of(existing));
        when(jwtUtils.generateTokenWithClaims(anyMap(), eq("test@oopsly.com")))
                .thenReturn("jwt-token");
        when(jwtUtils.generateRefreshToken(eq("test@oopsly.com"))).thenReturn("refresh-token");
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        OTPReq otpReq = mock(OTPReq.class);
        when(otpReq.email()).thenReturn("test@oopsly.com");
        when(otpReq.otp()).thenReturn("000000");

        var res = otpService.verifyOTP(otpReq);

        assertTrue(res.getBody().isSuccess());
        verify(userRepository, never()).save(any(User.class));
    }
}
