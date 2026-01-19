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

import { apiClient } from '@/config/axiosClient';
import { ApiResponse } from '@/types/ApiRes';
import { AuthTokens } from '@/types/AuthViewModel';

const OTP_ENDPOINTS = {
  SEND: '/otp',
  VALIDATE: '/otp/validate',
};

const sendOTP = async (email: string): Promise<ApiResponse<null>> => {
  const response = await apiClient.post(OTP_ENDPOINTS.SEND, null, {
    params: { email },
  });
  return response.data;
};

const verifyOTP = async (
  request: { email: string; otp: string }
): Promise<ApiResponse<AuthTokens>> => {
  const response = await apiClient.post(OTP_ENDPOINTS.VALIDATE, request);
  return response.data;
};

export const otpService = {
  sendOTP,
  verifyOTP,
};
