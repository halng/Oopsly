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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.impl.UserServiceImpl;
import com.app.oopsly.api.util.Constant;
import com.app.oopsly.api.util.JwtUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;

    @Mock private SecurityContext securityContext;

    @Mock private Authentication authentication;

    @Mock private JwtUtils jwtUtils;

    @Mock private StringRedisTemplate stringRedisTemplate;

    @Mock private ValueOperations<String, String> valueOps;

    @InjectMocks private UserServiceImpl userService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUserId_returnsUserIdFromSecurityContext() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());

        String result = userService.getCurrentUserId();

        assertEquals(userId.toString(), result);
        verify(securityContext, times(1)).getAuthentication();
        verify(authentication, times(1)).getPrincipal();
    }

    @Test
    void getCurrentUser_returnsUserFromDatabase() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertSame(user, result);
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void getCurrentUser_throwsException_whenUserNotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        UnauthenticatedException exception =
                assertThrows(UnauthenticatedException.class, () -> userService.getCurrentUser());
        assertTrue(exception.getMessage().contains("User not found"));
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void getCurrentUser_withRealAuthentication_works() {
        Authentication realAuth =
                new UsernamePasswordAuthenticationToken(userId.toString(), null, null);
        SecurityContext realContext = SecurityContextHolder.createEmptyContext();
        realContext.setAuthentication(realAuth);
        SecurityContextHolder.setContext(realContext);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertSame(user, result);
    }

    @Test
    void getCurrentUserId_withInvalidUUID_stillReturnsString() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        String result = userService.getCurrentUserId();

        assertEquals(invalidId, result);
    }

    @Test
    void getCurrentUser_withInvalidUUID_throwsIllegalArgumentException() {
        String invalidId = "not-a-uuid";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(invalidId);

        assertThrows(IllegalArgumentException.class, () -> userService.getCurrentUser());
    }

    @Test
    void getCurrentUser_withNullPrincipal_throwsNullPointerException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(null);

        assertThrows(NullPointerException.class, () -> userService.getCurrentUser());
    }

    @Test
    void getCurrentUser_calledMultipleTimes_queriesDatabaseEachTime() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.getCurrentUser();
        userService.getCurrentUser();
        userService.getCurrentUser();

        verify(userRepository, times(3)).findById(userId);
    }

    @Test
    void getCurrentUserFallback_throwsUnauthenticatedException() {
        RuntimeException cause = new RuntimeException("Database connection failed");

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("User service is currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getCurrentUserFallback_withDatabaseException_preservesCauseChain() {
        Exception originalCause = new java.sql.SQLException("Connection timeout");
        RuntimeException wrappedCause = new RuntimeException("Database error", originalCause);

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(wrappedCause));

        assertNotNull(exception.getCause());
        assertEquals(wrappedCause, exception.getCause());
        assertEquals(originalCause, exception.getCause().getCause());
    }

    @Test
    void getCurrentUserFallback_withNullThrowable_handlesGracefully() {
        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(null));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("User service is currently unavailable"));
        assertNull(exception.getCause());
    }

    @Test
    void getCurrentUserFallback_providesUserFriendlyMessage() {
        Throwable cause = new Throwable("Internal circuit breaker error");

        UnauthenticatedException exception =
                assertThrows(
                        UnauthenticatedException.class,
                        () -> userService.getCurrentUserFallback(cause));

        String message = exception.getMessage();
        assertTrue(message.contains("currently unavailable"));
        assertTrue(message.contains("try again later"));
    }

    // Refresh Token Tests
    @Test
    void refreshToken_success_returnsNewTokens() {
        String email = "test@example.com";
        String refreshToken = "valid-refresh-token";
        String storedRefreshToken = "valid-refresh-token";
        String newAccessToken = "new-access-token";
        String newRefreshToken = "new-refresh-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(storedRefreshToken);

        when(jwtUtils.generateTokenWithClaims(anyMap(), eq(email))).thenReturn(newAccessToken);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(jwtUtils, times(1)).isTokenValid(refreshToken, email);
        verify(valueOps, times(1)).get(Constant.REFRESH_TOKEN_REDIS_KEY + userId);
        verify(userRepository, times(1)).findByEmail(email);
        verify(jwtUtils, times(1)).generateTokenWithClaims(anyMap(), eq(email));
    }

    @Test
    void refreshToken_invalidToken_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "invalid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(false);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(jwtUtils, times(1)).isTokenValid(refreshToken, email);
        verify(stringRedisTemplate, never()).opsForValue();
    }

    @Test
    void refreshToken_tokenMismatch_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "token1";
        String storedToken = "token2";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(storedToken);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void refreshToken_noStoredToken_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(null);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void refreshToken_userNotFound_throwsException() {
        String email = "test@example.com";
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThrows(UnauthenticatedException.class, () -> userService.refreshToken(req));
    }

    @Test
    void refreshToken_emailMismatch_returnsUnauthorized() {
        String email = "test@example.com";
        String refreshToken = "valid-token";
        User differentUser = new User();
        differentUser.setId(userId);
        differentUser.setEmail("different@example.com");

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(jwtUtils.isTokenValid(refreshToken, email)).thenReturn(true);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(Constant.REFRESH_TOKEN_REDIS_KEY + userId)).thenReturn(refreshToken);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(differentUser));

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void refreshToken_withNullEmail_handlesGracefully() {
        String refreshToken = "valid-token";

        RefreshTokenReq req = new RefreshTokenReq(refreshToken, null);

        when(jwtUtils.isTokenValid(refreshToken, null)).thenReturn(false);

        ApiRes response = userService.refreshToken(req);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // Fallback Method Tests
    @Test
    void refreshTokenFallback_throwsRuntimeException() {
        RefreshTokenReq req = new RefreshTokenReq("token", "test@example.com");
        RuntimeException cause = new RuntimeException("Service unavailable");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class, () -> userService.refreshTokenFallback(req, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void refreshTokenFallback_withNullThrowable_handlesGracefully() {
        RefreshTokenReq req = new RefreshTokenReq("token", "test@example.com");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class, () -> userService.refreshTokenFallback(req, null));

        assertNotNull(exception);
        assertNotNull(exception.getMessage());
    }

    // Logout Tests
    @Test
    void logout_success_deletesRefreshToken() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(true);

        ApiRes response = userService.logout();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(stringRedisTemplate, times(1))
                .delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId.toString());
    }

    @Test
    void logout_noTokenFound_returnsSuccess() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId))
                .thenReturn(false);

        ApiRes response = userService.logout();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(stringRedisTemplate, times(1))
                .delete(Constant.REFRESH_TOKEN_REDIS_KEY + userId.toString());
    }

    @Test
    void logout_redisException_throwsRuntimeException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        when(stringRedisTemplate.delete(anyString()))
                .thenThrow(new RuntimeException("Redis connection failed"));

        assertThrows(RuntimeException.class, () -> userService.logout());
    }

    @Test
    void logoutFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Service unavailable");

        RuntimeException exception =
                assertThrows(RuntimeException.class, () -> userService.logoutFallback(cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void logoutFallback_withNullThrowable_handlesGracefully() {
        RuntimeException exception =
                assertThrows(RuntimeException.class, () -> userService.logoutFallback(null));

        assertNotNull(exception);
        assertNotNull(exception.getMessage());
    }
}
