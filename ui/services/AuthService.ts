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

import { apiClient } from ".";

const AUTH_PATHS = {
  CREATE_OTP: {
    method: "POST",
    url: "/otp",
    description: "Send OTP to email",
  },
  VALIDATE_OTP: {
    method: "POST",
    url: "/otp/validate",
    description: "Validate OTP from email",
  },
  VALIDATE_TOKEN: {
    method: "GET",
    url: "/users/validate",
    description: "Validate access token",
  },
  REFRESH_TOKEN: {
    method: "POST",
    url: "/users/refresh-token",
    description: "Refresh access token",
  },
};

const CreateOTP = async (email: string) => {
  const url = AUTH_PATHS.CREATE_OTP.url + `?email=${email}`;
  const response = await apiClient.post(url);
  return response.data;
};

const ValidateOTP = async (email: string, otp: string) => {
  const response = await apiClient.post(AUTH_PATHS.VALIDATE_OTP.url, {
    email,
    otp,
  });
  return response.data;
};

const ValidateToken = async () => {
  try {
    const response = await apiClient.get(AUTH_PATHS.VALIDATE_TOKEN.url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const RefreshToken = async (refreshToken: string) => {
  try {
    const response = await apiClient.post(AUTH_PATHS.REFRESH_TOKEN.url, {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AuthService = {
  CreateOTP,
  ValidateOTP,
  ValidateToken,
  RefreshToken,
};
