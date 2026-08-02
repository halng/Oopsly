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

package com.app.oopsly.api.unit.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.UserController;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserService userService;

    @InjectMocks private UserController userController;

    private String email;
    private String userId;
    private String refreshToken;

    @BeforeEach
    void setUp() {
        email = "test@example.com";
        userId = UUID.randomUUID().toString();
        refreshToken = "valid-refresh-token";
    }

    @Test
    void refreshToken_delegatesToService_and_returnsServiceResponse() {
        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);
        ApiRes expected = mock(ApiRes.class);

        when(userService.refreshToken(req)).thenReturn(expected);

        ApiRes actual = userController.refreshToken(req);

        verify(userService, times(1)).refreshToken(req);
        assertSame(expected, actual);
    }

    @Test
    void refreshToken_withValidRequest_callsService() {
        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);
        ApiRes mockResponse = mock(ApiRes.class);

        when(userService.refreshToken(req)).thenReturn(mockResponse);

        ApiRes response = userController.refreshToken(req);

        assertNotNull(response);
        verify(userService, times(1)).refreshToken(req);
    }

    @Test
    void refreshToken_withDifferentEmails_callsServiceWithCorrectData() {
        String email1 = "user1@example.com";
        String email2 = "user2@example.com";

        RefreshTokenReq req1 = new RefreshTokenReq(refreshToken, email1);
        RefreshTokenReq req2 = new RefreshTokenReq(refreshToken, email2);

        ApiRes response1 = mock(ApiRes.class);
        ApiRes response2 = mock(ApiRes.class);

        when(userService.refreshToken(req1)).thenReturn(response1);
        when(userService.refreshToken(req2)).thenReturn(response2);

        ApiRes actual1 = userController.refreshToken(req1);
        ApiRes actual2 = userController.refreshToken(req2);

        assertSame(response1, actual1);
        assertSame(response2, actual2);
        verify(userService, times(1)).refreshToken(req1);
        verify(userService, times(1)).refreshToken(req2);
    }

    @Test
    void refreshToken_multipleCallsSameRequest_callsServiceEachTime() {
        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);
        ApiRes mockResponse = mock(ApiRes.class);

        when(userService.refreshToken(req)).thenReturn(mockResponse);

        userController.refreshToken(req);
        userController.refreshToken(req);
        userController.refreshToken(req);

        verify(userService, times(3)).refreshToken(req);
    }

    @Test
    void refreshToken_serviceThrowsException_propagatesException() {
        RefreshTokenReq req = new RefreshTokenReq(refreshToken, email);

        when(userService.refreshToken(req)).thenThrow(new RuntimeException("Service error"));

        assertThrows(RuntimeException.class, () -> userController.refreshToken(req));
        verify(userService, times(1)).refreshToken(req);
    }

    @Test
    void logout_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);

        when(userService.logout()).thenReturn(expected);

        ApiRes actual = userController.logout();

        verify(userService, times(1)).logout();
        assertSame(expected, actual);
    }

    @Test
    void logout_callsServiceSuccessfully() {
        ApiRes mockResponse = mock(ApiRes.class);

        when(userService.logout()).thenReturn(mockResponse);

        ApiRes response = userController.logout();

        assertNotNull(response);
        verify(userService, times(1)).logout();
    }

    @Test
    void logout_serviceThrowsException_propagatesException() {
        when(userService.logout()).thenThrow(new RuntimeException("Service error"));

        assertThrows(RuntimeException.class, () -> userController.logout());
        verify(userService, times(1)).logout();
    }

    @Test
    void validate_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);

        when(userService.validateToken()).thenReturn(expected);

        ApiRes actual = userController.validate();

        verify(userService, times(1)).validateToken();
        assertSame(expected, actual);
    }

    @Test
    void validate_callsServiceSuccessfully() {
        ApiRes mockResponse = mock(ApiRes.class);

        when(userService.validateToken()).thenReturn(mockResponse);

        ApiRes response = userController.validate();

        assertNotNull(response);
        verify(userService, times(1)).validateToken();
    }

    @Test
    void validate_serviceThrowsException_propagatesException() {
        when(userService.validateToken()).thenThrow(new RuntimeException("Service error"));

        assertThrows(RuntimeException.class, () -> userController.validate());
        verify(userService, times(1)).validateToken();
    }
}
