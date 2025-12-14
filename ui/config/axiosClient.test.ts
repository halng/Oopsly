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

import { apiClient } from './axiosClient';
import { API_CONFIG } from './api';

describe('axiosClient', () => {
  describe('configuration', () => {
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

  describe('interceptors', () => {
    it('should have request interceptor configured', () => {
      expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
    });

    it('should have response interceptor configured', () => {
      expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
  });
});
