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
import { Logger } from "@/utils";

const logger = Logger.extend("AuthService");

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
    logger.debug("Validating access token...");
    const response = await apiClient.get(AUTH_PATHS.VALIDATE_TOKEN.url);
    logger.debug("Access token validation successful");
    return response.data;
  } catch (error) {
    logger.debug("Access token validation failed:", error);
    throw error;
  }
};

const RefreshToken = async (refreshToken: string, userEmail: string) => {
  try {
    logger.debug("Attempting to refresh access token...");
    const response = await apiClient.post(AUTH_PATHS.REFRESH_TOKEN.url, {
      refresh_token: refreshToken,
      user_email: userEmail,
    });
    logger.debug("Token refresh successful");
    return response.data;
  } catch (error) {
    logger.debug("Token refresh failed:", error);
    throw error;
  }
};

export const AuthService = {
  CreateOTP,
  ValidateOTP,
  ValidateToken,
  RefreshToken,
};
