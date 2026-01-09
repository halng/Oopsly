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

import { apiClient } from '../../config/axiosClient';
import { API_CONFIG } from '../../config/api';
import MockAdapter from 'axios-mock-adapter';

describe('axiosClient', () => {
  let mock: MockAdapter;

  // Initialize the mock adapter before running tests
  beforeAll(() => {
    mock = new MockAdapter(apiClient);
  });

  // Reset the mock after each test to ensure clean state
  afterEach(() => {
    mock.reset();
  });

  // Clean up after all tests
  afterAll(() => {
    mock.restore();
  });

  describe('Configuration', () => {
    it('should have correct base URL', () => {
      expect(apiClient.defaults.baseURL).toBe(API_CONFIG.BASE_URL);
    });

    it('should have correct timeout', () => {
      expect(apiClient.defaults.timeout).toBe(30000);
    });

    it('should have correct default headers', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Interceptors & Error Handling', () => {
    
    it('should return response successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      mock.onGet('/test').reply(200, mockData);

      const response = await apiClient.get('/test');
      
      // Your current client returns the full response object
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
    });

    // Case 1: Server responded with error status (error.response exists)
    it('should handle server errors with custom message', async () => {
      const errorMessage = 'Invalid credentials';
      mock.onGet('/error').reply(400, { message: errorMessage });

      await expect(apiClient.get('/error')).rejects.toThrow(errorMessage);
    });

    // Case 1b: Server responded but has no message field (Fallback)
    it('should handle server errors with default message when none provided', async () => {
      mock.onGet('/error-empty').reply(500, {}); // No message in body

      await expect(apiClient.get('/error-empty')).rejects.toThrow('An error occurred');
    });

    // Case 2: Request made but no response (Network Error)
    it('should handle network errors', async () => {
      mock.onGet('/network-error').networkError();

      await expect(apiClient.get('/network-error')).rejects.toThrow(
        'Network Error'
      );
    });

    // Case 3: Unexpected setup errors (Neither response nor request exists)
    it('should handle unexpected configuration errors', async () => {
      // We simulate a weird error that isn't a standard AxiosError with response/request
      mock.onGet('/unexpected').reply(() => {
        const error: any = new Error('Setup failed');
        // Ensure these are undefined to hit the "else" block
        error.response = undefined; 
        error.request = undefined;
        return Promise.reject(error);
      });

      await expect(apiClient.get('/unexpected')).rejects.toThrow('Setup failed');
    });
    
    // Testing the Request Interceptor (currently just pass-through)
    it('should allow headers to be modified in request interceptor', async () => {
      mock.onGet('/header-test').reply(200);

      // We spy on the mock to see what headers were actually sent
      const response = await apiClient.get('/header-test', {
        headers: { 'X-Custom-Header': 'foobar' }
      });

      expect(response.config.headers['X-Custom-Header']).toBe('foobar');
    });
  });
});

// import axios, { 
//   AxiosError, 
//   AxiosResponse, 
//   InternalAxiosRequestConfig 
// } from 'axios';
// import { API_CONFIG } from './api';
// import { ApiErrorResponse } from '../types/api';

// // Create axios instance
// export const apiClient = axios.create({
//   baseURL: API_CONFIG.BASE_URL,
//   timeout: 30000,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // --- Request Interceptor ---
// apiClient.interceptors.request.use(
//   (config: InternalAxiosRequestConfig) => {
//     // Example: Read token from localStorage/Cookie
//     const token = localStorage.getItem('accessToken'); 
    
//     if (token && config.headers) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // --- Response Interceptor ---
// apiClient.interceptors.response.use(
//   (response: AxiosResponse) => {
//     // OPTION 1: Return the full response (keep as is if you need headers/status)
//     // return response; 

//     // OPTION 2: Unwrap data directly (Cleaner usage in components)
//     return response.data;
//   },
//   (error: AxiosError<ApiErrorResponse>) => {
//     // 1. Handle Global Auth Errors (Optional but recommended)
//     if (error.response?.status === 401) {
//       // Handle logout logic here, e.g., clear storage, redirect to login
//       // window.location.href = '/login';
//     }

//     // 2. Construct a more useful error object
//     if (error.response) {
//       // Server responded with a status code outside the 2xx range
//       const errorData = error.response.data;
//       const errorMessage = errorData?.message || 'An error occurred';
      
//       // Reject with the specific data so the UI can read field-specific validation errors
//       // You can also attach the status code to the error object if needed
//       const customError = new Error(errorMessage) as any;
//       customError.status = error.response.status;
//       customError.data = errorData;
      
//       return Promise.reject(customError);
//     } else if (error.request) {
//       // Request was made but no response received
//       return Promise.reject(new Error('Network error. Please check your internet connection.'));
//     } else {
//       // Something else happened
//       return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
//     }
//   }
// );