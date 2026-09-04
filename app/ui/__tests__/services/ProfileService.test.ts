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

import { apiClient } from '../../services';
import {
  getProfile,
  updateProfile,
  updateSettings,
} from '../../services/ProfileService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets profile', async () => {
    const mockResponse = {
      data: { isSuccess: true, data: { displayName: 'Ada', bio: null, age: null } },
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await getProfile();

    expect(apiClient.get).toHaveBeenCalledWith('/user/profile');
    expect(result).toEqual(mockResponse.data);
  });

  it('updates profile', async () => {
    const payload = { displayName: 'Ada', bio: 'Math' };
    const mockResponse = { data: { isSuccess: true, data: payload } };
    (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await updateProfile(payload);

    expect(apiClient.patch).toHaveBeenCalledWith('/user/profile', payload);
    expect(result).toEqual(mockResponse.data);
  });

  it('updates settings', async () => {
    const payload = {
      theme: 'DARK',
      language: 'en',
      spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
      studySchedule: {
        preferredStudyTime: '09:00',
        studyDays: [1, 2, 3],
        reminderEnabled: true,
      },
    };
    const mockResponse = { data: { isSuccess: true, data: { settings: payload } } };
    (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await updateSettings(payload);

    expect(apiClient.patch).toHaveBeenCalledWith('/user/settings', payload);
    expect(result).toEqual(mockResponse.data);
  });
});
