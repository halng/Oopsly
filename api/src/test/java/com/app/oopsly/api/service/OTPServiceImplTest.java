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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.never;

import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.messaging.EmailSender;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.impl.OTPServiceImpl;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.viewmodel.OTPReq;
import jakarta.mail.MessagingException;
import java.io.IOException;
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

    @InjectMocks OTPServiceImpl otpService;

    @Captor ArgumentCaptor<Map<String, Object>> claimsCaptor;

    private final String email = "user@example.com";
    private final String userKey = "user";

    @BeforeEach
    void setUp() {}

    @Test
    void sendOTP_success_storesOtpAndAttempts_and_sendsEmail() throws Exception {
        // arrange
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        doNothing().when(emailSender).sendEmail(eq(email), anyString());

        // act
        var res = otpService.sendOTP(email);

        // assert - interaction checks
        verify(emailSender, times(1)).sendEmail(eq(email), anyString());
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
    void sendOTP_messagingException_returnsError_and_doesNotStore() throws Exception {
        // arrange
        doThrow(new MessagingException("fail")).when(emailSender).sendEmail(eq(email), anyString());

        // act
        var res = otpService.sendOTP(email);

        // assert
        verify(emailSender, times(1)).sendEmail(eq(email), anyString());
        verify(valueOps, never())
                .set(eq(Constant.OTP_REDIS_KEY + userKey), anyString(), anyLong(), any());
        verify(valueOps, never())
                .set(eq(Constant.OTP_ATTEMPT_REDIS_KEY + userKey), anyString(), anyLong(), any());
        assertNotNull(res);
    }

    @Test
    void sendOTP_ioException_returnsError_and_doesNotStore() throws Exception {
        // arrange
        doThrow(new IOException("io")).when(emailSender).sendEmail(eq(email), anyString());

        // act
        var res = otpService.sendOTP(email);

        // assert
        verify(emailSender, times(1)).sendEmail(eq(email), anyString());
        verify(valueOps, never())
                .set(eq(Constant.OTP_REDIS_KEY + userKey), anyString(), anyLong(), any());
        assertNotNull(res);
    }

    @Test
    void sendOTP_runtimeException_returnsError_and_doesNotStore() throws Exception {
        // arrange
        doThrow(new RuntimeException("boom")).when(emailSender).sendEmail(eq(email), anyString());

        // act
        var res = otpService.sendOTP(email);

        // assert
        verify(emailSender, times(1)).sendEmail(eq(email), anyString());
        verify(valueOps, never())
                .set(eq(Constant.OTP_REDIS_KEY + userKey), anyString(), anyLong(), any());
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
}
