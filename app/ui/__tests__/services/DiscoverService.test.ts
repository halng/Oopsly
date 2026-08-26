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
import { cloneDeck, discoverDecks } from '../../services/DiscoverService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('DiscoverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discovers decks with query params', async () => {
    const mockResponse = {
      data: {
        isSuccess: true,
        data: { entities: [], totalItems: 0, hasNextPage: false },
      },
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await discoverDecks('math', 1, 10);

    expect(apiClient.get).toHaveBeenCalledWith('/discover?q=math&page=1&size=10');
    expect(result).toEqual(mockResponse.data);
  });

  it('clones a public deck', async () => {
    const mockResponse = { data: { isSuccess: true, data: null } };
    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await cloneDeck('subject-1');

    expect(apiClient.post).toHaveBeenCalledWith('/discover/subject-1/clone');
    expect(result).toEqual(mockResponse.data);
  });
});
