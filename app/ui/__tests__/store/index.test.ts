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

// Mock AsyncStorage before imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

import { useAuthStore } from '../../store';

describe('Store Index Exports', () => {
  it('should export useAuthStore', () => {
    expect(useAuthStore).toBeDefined();
    expect(typeof useAuthStore).toBe('function');
  });

  it('should be able to get store state', () => {
    const state = useAuthStore.getState();
    expect(state).toHaveProperty('isAuthenticated');
    expect(state).toHaveProperty('userEmail');
    expect(state).toHaveProperty('accessToken');
    expect(state).toHaveProperty('refreshToken');
  });
});
