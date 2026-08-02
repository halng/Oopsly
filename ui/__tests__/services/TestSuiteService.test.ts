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
  createTestSuite,
  deleteTestSuite,
  fetchTestSuitesByShelf,
  runTestPreset,
} from '../../services/TestSuiteService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('TestSuiteService', () => {
  const shelfId = 'shelf-1';
  const suiteId = 'suite-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches test suites by shelf', async () => {
    const mockResponse = { data: { isSuccess: true, data: [] } };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await fetchTestSuitesByShelf(shelfId);

    expect(apiClient.get).toHaveBeenCalledWith(`/shelves/${shelfId}/test-suites`);
    expect(result).toEqual(mockResponse.data);
  });

  it('creates a test suite with defaults', async () => {
    const mockResponse = {
      data: { isSuccess: true, data: { id: suiteId, title: 'Quiz', isActive: true } },
    };
    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await createTestSuite(shelfId, { title: 'Quiz' });

    expect(apiClient.post).toHaveBeenCalledWith(`/shelves/${shelfId}/test-suites`, {
      title: 'Quiz',
      isActive: true,
      subjectIds: [],
      selection: null,
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('runs a test preset', async () => {
    const mockResponse = { data: { isSuccess: true, data: [] } };
    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await runTestPreset(shelfId, suiteId);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/shelves/${shelfId}/test-suites/${suiteId}/run`,
    );
    expect(result).toEqual(mockResponse.data);
  });

  it('deletes a test suite', async () => {
    const mockResponse = { data: { isSuccess: true, data: null } };
    (apiClient.delete as jest.Mock).mockResolvedValue(mockResponse);

    const result = await deleteTestSuite(shelfId, suiteId);

    expect(apiClient.delete).toHaveBeenCalledWith(
      `/shelves/${shelfId}/test-suites/${suiteId}`,
    );
    expect(result).toEqual(mockResponse.data);
  });
});
