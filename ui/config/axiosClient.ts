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

import axios, { AxiosError } from 'axios';
import { ApiErrorResponse } from '@/types/ApiRes';
import { useAuthStore } from '@/store';
import { API_CONFIG } from './api';

interface IPathConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    description?: string;
}

const PUBLIC_PATHS: IPathConfig[] = [
    {
        method: 'POST',
        url: 'otp',
    },
    {
        method: 'POST',
        url: 'otp/validate',
    }
];

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const isPublicPath = PUBLIC_PATHS.some((path => 
      path.method === config.method?.toUpperCase() && 
      config.url?.includes(path.url)
    ));

    if (isPublicPath) {
      return config;
    }

    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const errorData = error.response.data;
      const errorMessage = errorData?.message || 'An error occurred';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
    }
  }
);

export { apiClient, IPathConfig };
