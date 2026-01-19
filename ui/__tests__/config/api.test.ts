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

import { API_CONFIG } from '../../config/api';

describe('API Configuration', () => {
  describe('API_CONFIG', () => {
    it('should have correct structure', () => {
      expect(API_CONFIG).toBeDefined();
      expect(API_CONFIG).toHaveProperty('BASE_URL');
      expect(API_CONFIG).toHaveProperty('TIMEOUT');
    });

    it('should have BASE_URL as a string', () => {
      expect(typeof API_CONFIG.BASE_URL).toBe('string');
      expect(API_CONFIG.BASE_URL.length).toBeGreaterThan(0);
    });

    it('should have TIMEOUT as a number', () => {
      expect(typeof API_CONFIG.TIMEOUT).toBe('number');
      expect(API_CONFIG.TIMEOUT).toBeGreaterThan(0);
    });

    it('should have timeout of 30000ms (30 seconds)', () => {
      expect(API_CONFIG.TIMEOUT).toBe(30000);
    });

    it('should have BASE_URL with correct format', () => {
      expect(API_CONFIG.BASE_URL).toContain('api/v1/osmosis');
    });

    it('should handle default BASE_URL when BACKEND_API is not set', () => {
      const originalEnv = process.env.BACKEND_API;
      delete process.env.BACKEND_API;
      
      // Re-import the module to test the default
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { API_CONFIG: freshConfig } = require('../../config/api');
      
      expect(freshConfig.BASE_URL).toContain('localhost:9009');
      expect(freshConfig.BASE_URL).toContain('api/v1/osmosis');
      
      // Restore
      process.env.BACKEND_API = originalEnv;
    });

    it('should use BACKEND_API environment variable when set', () => {
      const originalEnv = process.env.BACKEND_API;
      process.env.BACKEND_API = 'https://test-api.example.com';
      
      // Re-import the module to test the env variable
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { API_CONFIG: freshConfig } = require('../../config/api');
      
      expect(freshConfig.BASE_URL).toContain('https://test-api.example.com');
      expect(freshConfig.BASE_URL).toContain('api/v1/osmosis');
      
      // Restore
      process.env.BACKEND_API = originalEnv;
      jest.resetModules();
    });
  });
});
