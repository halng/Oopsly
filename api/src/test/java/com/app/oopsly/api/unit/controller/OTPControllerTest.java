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

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.OTPController;
import com.app.oopsly.api.service.OTPService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.OTPReq;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OTPControllerTest {

    @Mock private OTPService otpService;

    @InjectMocks private OTPController otpController;

    private final String email = "user@example.com";

    @BeforeEach
    void setUp() {
        // no-op
    }

    @Test
    void createOTP_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);
        when(otpService.sendOTP(email)).thenReturn(expected);

        ApiRes actual = otpController.createOTP(email);

        verify(otpService, times(1)).sendOTP(email);
        assertSame(expected, actual);
    }

    @Test
    void validateOTP_delegatesToService_and_returnsServiceResponse() {
        OTPReq req = mock(OTPReq.class);

        ApiRes expected = mock(ApiRes.class);
        when(otpService.verifyOTP(req)).thenReturn(expected);

        ApiRes actual = otpController.validateOTP(req);

        verify(otpService, times(1)).verifyOTP(req);
        assertSame(expected, actual);
    }
}
