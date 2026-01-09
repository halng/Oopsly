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

import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.OTPReq;

public interface OTPService {
    /**
     * Sends an OTP to the specified email address.
     *
     * @param email: The recipient's email address.
     * @return ApiRes: The response indicating success or failure of the operation.
     */
    ApiRes sendOTP(String email);

    /**
     * Verifies the provided OTP for the specified email address.
     *
     * @param OTPVm: The OTP view model containing email and OTP code.
     * @return ApiRes: The response indicating whether the OTP is valid or not.
     */
    ApiRes verifyOTP(OTPReq otpReq);
}
