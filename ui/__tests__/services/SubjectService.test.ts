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
  createSubject,
  getSubjectById,
  updateSubjectSetting,
  deleteSubject,
  updateSubjectById,
} from '../../services/SubjectService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('SubjectService', () => {
  const shelfId = 'shelf-123';
  const subjectId = 'subject-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubject', () => {
    it('creates subject successfully', async () => {
      const subjectData = {
        name: 'Mathematics',
        description: 'Advanced Math Course',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Subject created successfully',
          data: {
            id: 'new-subject-id',
            ...subjectData,
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createSubject(shelfId, subjectData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects`,
        subjectData
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });

    it('handles creation error', async () => {
      const subjectData = {
        name: 'Physics',
        description: 'Physics Course',
      };

      const error = new Error('Creation failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        createSubject(shelfId, subjectData)
      ).rejects.toThrow('Creation failed');
    });

    it('creates subject with empty description', async () => {
      const subjectData = {
        name: 'Chemistry',
        description: '',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Subject created',
          data: { id: 'subject-id', ...subjectData },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createSubject(shelfId, subjectData);

      expect(result.isSuccess).toBe(true);
      expect(result.data.description).toBe('');
    });
  });

  describe('getSubjectById', () => {
    it('fetches subject successfully', async () => {
      const mockSubject = {
        id: subjectId,
        name: 'Mathematics',
        description: 'Math Course',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: mockSubject,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getSubjectById(shelfId, subjectId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}`
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.data.id).toBe(subjectId);
    });

    it('handles fetch error', async () => {
      const error = new Error('Fetch failed');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(
        getSubjectById(shelfId, subjectId)
      ).rejects.toThrow('Fetch failed');
    });

    it('handles non-existent subject', async () => {
      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Subject not found',
          data: null,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getSubjectById(shelfId, 'invalid-id');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Subject not found');
    });
  });

  describe('updateSubjectById', () => {
    it('updates subject successfully', async () => {
      const updateData = {
        name: 'Updated Math',
        description: 'Updated description',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Subject updated successfully',
          data: { id: subjectId, ...updateData },
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateSubjectById(shelfId, subjectId, updateData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}`,
        updateData
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles update error', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated Desc',
      };

      const error = new Error('Update failed');
      (apiClient.put as jest.Mock).mockRejectedValue(error);

      await expect(
        updateSubjectById(shelfId, subjectId, updateData)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('updateSubjectSetting', () => {
    it('updates subject settings successfully', async () => {
      const settings = {
        dailyLimit: 20,
        newCardsPerDay: 20,
        interval: 7,
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Settings updated',
          data: settings,
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateSubjectSetting(shelfId, subjectId, settings);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/settings`,
        settings
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles settings update error', async () => {
      const settings = {
        dailyLimit: 10,
        newCardsPerDay: 5,
        interval: 5,
      };
      const error = new Error('Settings update failed');
      (apiClient.put as jest.Mock).mockRejectedValue(error);

      await expect(
        updateSubjectSetting(shelfId, subjectId, settings)
      ).rejects.toThrow('Settings update failed');
    });
  });

  describe('deleteSubject', () => {
    it('soft-deletes a subject', async () => {
      const mockResponse = {
        data: { isSuccess: true, message: 'Deleted', data: null },
      };
      (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await deleteSubject(shelfId, subjectId);

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}`,
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Edge Cases', () => {
    it('handles network timeout', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(
        getSubjectById(shelfId, subjectId)
      ).rejects.toThrow('Timeout');
    });

    it('handles 500 server error', async () => {
      const error = new Error('Internal Server Error');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        createSubject(shelfId, { name: 'Test', description: 'Test' })
      ).rejects.toThrow('Internal Server Error');
    });
  });
});
