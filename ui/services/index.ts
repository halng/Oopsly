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

import axios, { AxiosError } from "axios";
import { ApiErrorResponse } from "@/types/ApiRes";
import { useAuthStore } from "@/store";
import { Logger } from "@/utils";
import { Platform } from "react-native";
import { ulid } from "ulid";

const logger = Logger.extend("apiClient");
const XRequestIdHeader = "X-Request-ID";
const XPlatformHeader = "X-Platform";
interface IPathConfig {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  description?: string;
}

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_API || "http://localhost:9009";
const BASE_PATH = "api/v1/oopsly";

const PUBLIC_PATHS: IPathConfig[] = [
  {
    method: "POST",
    url: "otp",
  },
  {
    method: "POST",
    url: "otp/validate",
  },
  {
    method: "POST",
    url: "users/refresh-token",
  },
];

const apiClient = axios.create({
  baseURL: `${BASE_URL}/${BASE_PATH}`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    let requestId = ulid();
    config.headers.set(XRequestIdHeader, requestId);
    config.headers.set(XPlatformHeader, Platform.OS);

    logger.debug(
      "Request interceptor triggered for ",
      config.url,
      "Request method:",
      config.method,
      "Config: ",
      config,
    );
    const isPublicPath = PUBLIC_PATHS.some(
      (path) =>
        path.method === config.method?.toUpperCase() &&
        config.url?.includes(path.url),
    );

    if (isPublicPath) {
      logger.debug(
        "Public path detected, skipping Authorization header addition",
      );

      return config;
    }

    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      logger.debug("Added Authorization header");
    }
    return config;
  },
  (error) => {
    logger.error(`Request error: ${error} for ${error.config?.url}`);
    return Promise.reject(error);
  },
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    logger.error(`Response error: ${error} for ${error.config?.url}`);
    // Handle common error responses
    if (error.response) {
      const errorData = error.response.data;
      const errorMessage = errorData?.message || "An error occurred";
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      return Promise.reject(
        new Error("Network error. Please check your connection."),
      );
    } else {
      return Promise.reject(
        new Error(error.message || "An unexpected error occurred"),
      );
    }
  },
);

export { apiClient, IPathConfig };
