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
  fetchShelves,
  getShelfById,
  createShelf,
  updateShelve,
  deleteShelf,
} from '../../services/ShelfService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('ShelfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchShelves', () => {
    it('fetches shelves successfully with params', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: {
            entities: [
              { id: '1', name: 'Shelf 1', icon: 'Code', subjects: [] },
              { id: '2', name: 'Shelf 2', icon: 'BookOpen', subjects: [] },
            ],
            totalElements: 2,
            totalPages: 1,
            currentPage: 0,
            pageSize: 10,
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchShelves({ page: 0, size: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/shelves', {
        params: { page: 0, size: 10 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches shelves without params', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: {
            entities: [],
            totalElements: 0,
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchShelves();

      expect(apiClient.get).toHaveBeenCalledWith('/shelves', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('handles fetch error', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(fetchShelves()).rejects.toThrow('Network error');
    });

    it('fetches with different page sizes', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: {
            entities: [],
            totalElements: 0,
            totalPages: 0,
            currentPage: 0,
            pageSize: 100,
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await fetchShelves({ page: 0, size: 100 });

      expect(apiClient.get).toHaveBeenCalledWith('/shelves', {
        params: { page: 0, size: 100 },
      });
    });
  });

  describe('getShelfById', () => {
    it('fetches shelf by ID successfully', async () => {
      const mockShelf = {
        id: 'shelf-123',
        name: 'Test Shelf',
        description: 'Description',
        icon: 'Code',
        subjects: [],
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: mockShelf,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getShelfById('shelf-123');

      expect(apiClient.get).toHaveBeenCalledWith('/shelves/shelf-123');
      expect(result).toEqual(mockResponse.data);
      expect(result.data.id).toBe('shelf-123');
    });

    it('handles shelf not found', async () => {
      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Shelf not found',
          data: null,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getShelfById('invalid-id');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Shelf not found');
    });

    it('handles network error', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(getShelfById('shelf-123')).rejects.toThrow('Network error');
    });
  });

  describe('createShelf', () => {
    it('creates shelf successfully', async () => {
      const shelfData = {
        name: 'New Shelf',
        description: 'New Description',
        icon: 'Code',
        color: '#4F46E5',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Shelf created successfully',
          data: {
            id: 'new-shelf-id',
            ...shelfData,
            subjects: [],
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createShelf(shelfData);

      expect(apiClient.post).toHaveBeenCalledWith('/shelves', shelfData);
      expect(result).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });

    it('handles creation error', async () => {
      const shelfData = {
        name: 'New Shelf',
        description: 'Description',
        icon: 'Code',
      };

      const error = new Error('Creation failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(createShelf(shelfData)).rejects.toThrow('Creation failed');
    });

    it('creates shelf without optional fields', async () => {
      const shelfData = {
        name: 'Minimal Shelf',
        icon: 'BookOpen',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Created',
          data: {
            id: 'shelf-id',
            ...shelfData,
            subjects: [],
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createShelf(shelfData);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('updateShelve', () => {
    it('updates shelf successfully', async () => {
      const updateData = {
        name: 'Updated Shelf',
        description: 'Updated Description',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Shelf updated successfully',
          data: {
            id: 'shelf-123',
            ...updateData,
            icon: 'Code',
            subjects: [],
          },
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateShelve('shelf-123', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/shelves/shelf-123', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles update error', async () => {
      const updateData = {
        name: 'Updated Shelf',
      };

      const error = new Error('Update failed');
      (apiClient.put as jest.Mock).mockRejectedValue(error);

      await expect(updateShelve('shelf-123', updateData)).rejects.toThrow('Update failed');
    });

    it('updates with special characters', async () => {
      const updateData = {
        name: 'Math & Physics: 101!',
        description: 'Course with symbols @#$%',
      };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Updated',
          data: { id: 'shelf-123', ...updateData, subjects: [] },
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateShelve('shelf-123', updateData);

      expect(result.data.name).toContain('&');
    });
  });

  describe('deleteShelf', () => {
    it('deletes shelf successfully', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Shelf deleted successfully',
          data: null,
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await deleteShelf('shelf-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/shelves/shelf-123');
      expect(result).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });

    it('handles delete error', async () => {
      const error = new Error('Delete failed');
      (apiClient.patch as jest.Mock).mockRejectedValue(error);

      await expect(deleteShelf('shelf-123')).rejects.toThrow('Delete failed');
    });

    it('handles delete with non-existent shelf', async () => {
      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Shelf not found',
          data: null,
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await deleteShelf('invalid-id');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Shelf not found');
    });
  });

  describe('Edge Cases', () => {
    it('handles timeout error', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(fetchShelves()).rejects.toThrow('Timeout');
    });

    it('handles 500 server error', async () => {
      const error = new Error('Internal Server Error');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        createShelf({ name: 'Test', icon: 'Code' })
      ).rejects.toThrow('Internal Server Error');
    });

    it('handles unauthorized access', async () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(getShelfById('shelf-123')).rejects.toThrow('Unauthorized');
    });

    it('handles very long shelf names', async () => {
      const longName = 'A'.repeat(1000);
      const shelfData = {
        name: longName,
        icon: 'Code',
      };

      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Name too long',
          data: null,
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createShelf(shelfData);

      expect(result.isSuccess).toBe(false);
    });
  });
});
