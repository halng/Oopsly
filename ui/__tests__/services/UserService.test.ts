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
import { getUserStats } from '../../services/UserService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches current user stats', async () => {
    const mockResponse = {
      data: {
        isSuccess: true,
        data: {
          dailyStreak: 3,
          totalXp: 100,
          cardsReviewedToday: 5,
          totalCards: 20,
          dueCards: 2,
          retentionRate: 80,
        },
      },
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await getUserStats();

    expect(apiClient.get).toHaveBeenCalledWith('/users/me/stats');
    expect(result).toEqual(mockResponse.data);
  });
});
