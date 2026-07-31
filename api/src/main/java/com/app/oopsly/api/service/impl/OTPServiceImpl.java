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

import com.app.oopsly.api.config.AppConfig;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.SendEmailException;
import com.app.oopsly.api.messaging.IEmailSender;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.OTPService;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.util.ValidateStatus;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.AuthRes;
import com.app.oopsly.api.viewmodel.OTPReq;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.mail.MessagingException;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@AllArgsConstructor
public class OTPServiceImpl implements OTPService {

    private final IEmailSender emailSender;
    private final UserRepository userRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final JwtUtils jwtUtils;
    private static final SecureRandom random = new SecureRandom();
    private final AppConfig appConfig;

    @Override
    @CircuitBreaker(name = "otpServiceCircuitBreaker", fallbackMethod = "sendOTPFallback")
    public ApiRes sendOTP(String email) {
        if (appConfig.isTestEmail(email)) {
            log.info("Test email detected. Skipping OTP send for {}", StringUtils.masked(email));
            return ApiRes.ok("OTP sent successfully to " + email);
        }
        log.info("Sending OTP email to {}", StringUtils.masked(email));
        String user = email.split("@")[0];
        int otpCode = random.nextInt(900000) + 100000;
        String otpKey = Constant.OTP_REDIS_KEY + user;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + user;

        this.sendAsyncEmail(email, String.valueOf(otpCode));

        try {
            stringRedisTemplate
                    .opsForValue()
                    .set(
                            otpKey,
                            String.valueOf(otpCode),
                            Constant.OTP_EXPIRATION_MINUTES,
                            TimeUnit.MINUTES);
            stringRedisTemplate
                    .opsForValue()
                    .set(attemptKey, "0", Constant.OTP_EXPIRATION_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("Failed to store OTP in Redis for {}: {}", email, e.getMessage());
            throw e;
        } finally {
            log.info("OTP process completed for {}", StringUtils.masked(email));
        }

        return ApiRes.ok("OTP sent successfully to " + email);
    }

    @Override
    @CircuitBreaker(name = "otpServiceCircuitBreaker", fallbackMethod = "verifyOTPFallback")
    public ApiRes verifyOTP(OTPReq otpReq) {
        if (appConfig.isTestEmail(otpReq.email()) && otpReq.otp().equals("000000")) {
            log.info(
                    "Test email and OTP detected. Skipping OTP verification for {}",
                    StringUtils.masked(otpReq.email()));
            return handleAuthSuccess(otpReq.email());
        }
        return switch (check(otpReq.email().split("@")[0], otpReq.otp())) {
            case VALID -> handleAuthSuccess(otpReq.email());
            case INVALID -> ApiRes.badRequest("OTP is invalid. Please try again.");
            case EXPIRED -> ApiRes.notFound("OTP has expired. Please request a new one.");
            case INVALIDATED -> ApiRes.rateLimitExceeded(
                    "OTP has been invalidated due to too many failed attempts. Try again after 5"
                            + " minutes.");
        };
    }

    private ApiRes handleAuthSuccess(String email) {
        log.info("Authentication successful for {}. Generating token..", StringUtils.masked(email));
        Optional<User> user = userRepository.findByEmail(email);

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "USER");
        if (user.isEmpty()) {
            log.warn("User not found for email {}", StringUtils.masked(email));
            User createdUser = this.userRepository.save(User.builder().email(email).build());
            claims.put("id", createdUser.getId().toString());
        } else {
            claims.put("id", user.get().getId().toString());
        }

        log.info("Generating JWT token for {}", StringUtils.masked(email));
        String jwtToken = jwtUtils.generateTokenWithClaims(claims, email);
        String refreshToken = jwtUtils.generateRefreshToken(email);

        AuthRes authRes = new AuthRes(jwtToken, refreshToken, Constant.TOKEN_TYPE_BEARER);

        log.info("Saving refresh token into cache for user {}", StringUtils.masked(email));
        String refreshTokenKey = Constant.REFRESH_TOKEN_REDIS_KEY + claims.get("id");
        stringRedisTemplate
                .opsForValue()
                .set(
                        refreshTokenKey,
                        refreshToken,
                        Constant.REFRESH_TOKEN_EXPIRATION_DAYS,
                        TimeUnit.DAYS);

        return ApiRes.ok("Authentication successful.", authRes);
    }

    private ValidateStatus check(String user, String inputOtp) {
        log.info("Checking OTP for {}", user);
        String otpKey = Constant.OTP_REDIS_KEY + user;
        String attemptKey = Constant.OTP_ATTEMPT_REDIS_KEY + user;

        String storedOtp = stringRedisTemplate.opsForValue().get(otpKey);
        String attemptStr = stringRedisTemplate.opsForValue().get(attemptKey);
        int attempts = attemptStr != null ? Integer.parseInt(attemptStr) : 0;

        if (storedOtp == null) {
            return ValidateStatus.EXPIRED;
        }

        if (attempts >= Constant.OTP_MAX_ATTEMPT) {
            return ValidateStatus.INVALIDATED;
        }

        if (storedOtp.equals(inputOtp)) {
            stringRedisTemplate.delete(otpKey);
            stringRedisTemplate.delete(attemptKey);
            return ValidateStatus.VALID;
        } else {
            attempts++;
            stringRedisTemplate
                    .opsForValue()
                    .set(
                            attemptKey,
                            String.valueOf(attempts),
                            Constant.OTP_EXPIRATION_MINUTES,
                            TimeUnit.MINUTES);
            return ValidateStatus.INVALID;
        }
    }

    @Async
    protected void sendAsyncEmail(String email, String otpCode) {
        CompletableFuture.runAsync(
                () -> {
                    try {
                        emailSender.sendEmail(email, otpCode);
                        log.info(
                                "Async: OTP email sent successfully to {}",
                                StringUtils.masked(email));
                    } catch (MessagingException e) {
                        log.error(
                                "Async: Failed to send OTP email to {}: {}", email, e.getMessage());
                        throw new SendEmailException("Failed to send OTP email to " + email);
                    } catch (IOException e) {
                        log.error(
                                "Async: IO Exception when sending OTP email to {}: {}",
                                email,
                                e.getMessage());
                        throw new SendEmailException("IO error when sending OTP email to " + email);
                    } catch (Exception e) {
                        log.error(
                                "Async: Runtime Exception when processing OTP for {}: {}",
                                email,
                                e.getMessage());
                        throw e;
                    }
                });
    }

    // Fallback method for sendOTP
    // Fallback method for sendOTP
    public ApiRes sendOTPFallback(String email, Throwable t) {
        log.error("OTP service unavailable during sendOTP: {}", t.getMessage());
        throw new RetryLaterException(
                "OTP service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for verifyOTP
    public ApiRes verifyOTPFallback(OTPReq otpReq, Throwable t) {
        log.error("OTP service unavailable during verifyOTP");
        throw new RetryLaterException(
                "OTP service is currently unavailable. Please try again later.", t);
    }
}
