/*
 *    Copyright 2025 Hao Nguyen Tan
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

import { API_CONFIG } from '../config/api';
import { ApiResponse, AuthTokens, OTPVerifyRequest } from '../types/api';

export const otpService = {
  async sendOTP(email: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/otp?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to send OTP';
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If JSON parsing fails, use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async verifyOTP(request: OTPVerifyRequest): Promise<ApiResponse<AuthTokens>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/otp/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to verify OTP';
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If JSON parsing fails, use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};
