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
import { shelveService } from '../../services/shelveService';
import { ApiResponse } from '../../types/api';
import { Shelve, ShelvePaginatedResponse } from '../../types/Shelve';

jest.mock('../../config/axiosClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('shelveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockShelve: Shelve = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Japanese Vocabulary',
    description: 'Basic Japanese words for beginners',
    createdAt: '2025-12-14T23:00:00.000Z',
    updatedAt: '2025-12-14T23:00:00.000Z',
  };

  describe('fetchShelves', () => {
    it('should successfully fetch shelves', async () => {
      const mockPaginatedResponse: ShelvePaginatedResponse = {
        content: [mockShelve],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      };

      const mockResponse: ApiResponse<ShelvePaginatedResponse> = {
        status: 200,
        message: 'Shelves retrieved successfully',
        data: mockPaginatedResponse,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await shelveService.fetchShelves();

      expect(apiClient.get).toHaveBeenCalledWith('/shelves', { params: undefined });
      expect(result).toEqual(mockResponse);
      expect(result.data.content).toHaveLength(1);
    });

    it('should fetch shelves with pagination params', async () => {
      const mockPaginatedResponse: ShelvePaginatedResponse = {
        content: [mockShelve],
        totalElements: 1,
        totalPages: 1,
        size: 5,
        number: 0,
      };

      const mockResponse: ApiResponse<ShelvePaginatedResponse> = {
        status: 200,
        message: 'Shelves retrieved successfully',
        data: mockPaginatedResponse,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const params = { page: 0, size: 5, sortBy: 'name', sortDirection: 'ASC' as const };
      const result = await shelveService.fetchShelves(params);

      expect(apiClient.get).toHaveBeenCalledWith('/shelves', { params });
      expect(result.data.size).toBe(5);
    });

    it('should handle network error when fetching shelves', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(shelveService.fetchShelves()).rejects.toThrow('Network error. Please check your connection.');
    });
  });

  describe('createShelve', () => {
    it('should successfully create a shelve', async () => {
      const createData = { name: 'Japanese Vocabulary', description: 'Basic Japanese words for beginners' };
      const mockResponse: ApiResponse<Shelve> = {
        status: 201,
        message: 'Shelve created successfully',
        data: mockShelve,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await shelveService.createShelve(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/shelves', createData);
      expect(result).toEqual(mockResponse);
      expect(result.data.name).toBe('Japanese Vocabulary');
    });

    it('should create a shelve without description', async () => {
      const createData = { name: 'Math Formulas' };
      const shelveWithoutDescription: Shelve = {
        ...mockShelve,
        name: 'Math Formulas',
        description: null,
      };
      const mockResponse: ApiResponse<Shelve> = {
        status: 201,
        message: 'Shelve created successfully',
        data: shelveWithoutDescription,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await shelveService.createShelve(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/shelves', createData);
      expect(result.data.description).toBeNull();
    });

    it('should handle validation error when name is missing', async () => {
      const errorMessage = 'Name is required';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(shelveService.createShelve({ name: '' })).rejects.toThrow(errorMessage);
    });
  });

  describe('updateShelve', () => {
    it('should successfully update a shelve', async () => {
      const updateData = { name: 'Advanced Japanese Vocabulary', description: 'Advanced Japanese words' };
      const updatedShelve: Shelve = {
        ...mockShelve,
        name: 'Advanced Japanese Vocabulary',
        description: 'Advanced Japanese words',
        updatedAt: '2025-12-14T23:10:00.000Z',
      };
      const mockResponse: ApiResponse<Shelve> = {
        status: 200,
        message: 'Shelve updated successfully',
        data: updatedShelve,
        isSuccess: true,
        timestamp: '2025-12-14T23:10:00.000Z',
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await shelveService.updateShelve(mockShelve.id, updateData);

      expect(apiClient.put).toHaveBeenCalledWith(`/shelves/${mockShelve.id}`, updateData);
      expect(result.data.name).toBe('Advanced Japanese Vocabulary');
    });

    it('should handle not found error when updating non-existent shelve', async () => {
      const errorMessage = 'Shelve not found';
      (apiClient.put as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(shelveService.updateShelve('non-existent-id', { name: 'Test' })).rejects.toThrow(errorMessage);
    });

    it('should handle permission error when updating shelve owned by another user', async () => {
      const errorMessage = 'You do not have permission to update this shelve';
      (apiClient.put as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(shelveService.updateShelve(mockShelve.id, { name: 'Test' })).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteShelve', () => {
    it('should successfully soft delete a shelve', async () => {
      const mockResponse: ApiResponse<null> = {
        status: 200,
        message: 'Shelve deleted successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-14T23:14:00.000Z',
      };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await shelveService.deleteShelve(mockShelve.id);

      expect(apiClient.patch).toHaveBeenCalledWith(`/shelves/${mockShelve.id}`);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle not found error when deleting non-existent shelve', async () => {
      const errorMessage = 'Shelve not found';
      (apiClient.patch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(shelveService.deleteShelve('non-existent-id')).rejects.toThrow(errorMessage);
    });

    it('should handle permission error when deleting shelve owned by another user', async () => {
      const errorMessage = 'You do not have permission to delete this shelve';
      (apiClient.patch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(shelveService.deleteShelve(mockShelve.id)).rejects.toThrow(errorMessage);
    });
  });
});
