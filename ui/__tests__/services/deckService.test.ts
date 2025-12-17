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
import { deckService } from '../../services/deckService';
import { ApiResponse } from '../../types/api';
import { Deck, DeckPaginatedResponse } from '../../types/Deck';

jest.mock('../../config/axiosClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('deckService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDeck: Deck = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Japanese Vocabulary',
    description: 'Basic Japanese words for beginners',
    createdAt: '2025-12-14T23:00:00.000Z',
    updatedAt: '2025-12-14T23:00:00.000Z',
  };

  describe('fetchDecks', () => {
    it('should successfully fetch decks', async () => {
      const mockPaginatedResponse: DeckPaginatedResponse = {
        content: [mockDeck],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      };

      const mockResponse: ApiResponse<DeckPaginatedResponse> = {
        status: 200,
        message: 'Decks retrieved successfully',
        data: mockPaginatedResponse,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await deckService.fetchDecks();

      expect(apiClient.get).toHaveBeenCalledWith('/decks', { params: undefined });
      expect(result).toEqual(mockResponse);
      expect(result.data.content).toHaveLength(1);
    });

    it('should fetch decks with pagination params', async () => {
      const mockPaginatedResponse: DeckPaginatedResponse = {
        content: [mockDeck],
        totalElements: 1,
        totalPages: 1,
        size: 5,
        number: 0,
      };

      const mockResponse: ApiResponse<DeckPaginatedResponse> = {
        status: 200,
        message: 'Decks retrieved successfully',
        data: mockPaginatedResponse,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const params = { page: 0, size: 5, sortBy: 'name', sortDirection: 'ASC' as const };
      const result = await deckService.fetchDecks(params);

      expect(apiClient.get).toHaveBeenCalledWith('/decks', { params });
      expect(result.data.size).toBe(5);
    });

    it('should handle network error when fetching decks', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(deckService.fetchDecks()).rejects.toThrow('Network error. Please check your connection.');
    });
  });

  describe('createDeck', () => {
    it('should successfully create a deck', async () => {
      const createData = { name: 'Japanese Vocabulary', description: 'Basic Japanese words for beginners' };
      const mockResponse: ApiResponse<Deck> = {
        status: 201,
        message: 'Deck created successfully',
        data: mockDeck,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await deckService.createDeck(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/decks', createData);
      expect(result).toEqual(mockResponse);
      expect(result.data.name).toBe('Japanese Vocabulary');
    });

    it('should create a deck without description', async () => {
      const createData = { name: 'Math Formulas' };
      const deckWithoutDescription: Deck = {
        ...mockDeck,
        name: 'Math Formulas',
        description: null,
      };
      const mockResponse: ApiResponse<Deck> = {
        status: 201,
        message: 'Deck created successfully',
        data: deckWithoutDescription,
        isSuccess: true,
        timestamp: '2025-12-14T23:00:00.000Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await deckService.createDeck(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/decks', createData);
      expect(result.data.description).toBeNull();
    });

    it('should handle validation error when name is missing', async () => {
      const errorMessage = 'Name is required';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(deckService.createDeck({ name: '' })).rejects.toThrow(errorMessage);
    });
  });

  describe('updateDeck', () => {
    it('should successfully update a deck', async () => {
      const updateData = { name: 'Advanced Japanese Vocabulary', description: 'Advanced Japanese words' };
      const updatedDeck: Deck = {
        ...mockDeck,
        name: 'Advanced Japanese Vocabulary',
        description: 'Advanced Japanese words',
        updatedAt: '2025-12-14T23:10:00.000Z',
      };
      const mockResponse: ApiResponse<Deck> = {
        status: 200,
        message: 'Deck updated successfully',
        data: updatedDeck,
        isSuccess: true,
        timestamp: '2025-12-14T23:10:00.000Z',
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await deckService.updateDeck(mockDeck.id, updateData);

      expect(apiClient.put).toHaveBeenCalledWith(`/decks/${mockDeck.id}`, updateData);
      expect(result.data.name).toBe('Advanced Japanese Vocabulary');
    });

    it('should handle not found error when updating non-existent deck', async () => {
      const errorMessage = 'Deck not found';
      (apiClient.put as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(deckService.updateDeck('non-existent-id', { name: 'Test' })).rejects.toThrow(errorMessage);
    });

    it('should handle permission error when updating deck owned by another user', async () => {
      const errorMessage = 'You do not have permission to update this deck';
      (apiClient.put as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(deckService.updateDeck(mockDeck.id, { name: 'Test' })).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteDeck', () => {
    it('should successfully soft delete a deck', async () => {
      const mockResponse: ApiResponse<null> = {
        status: 200,
        message: 'Deck deleted successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-14T23:14:00.000Z',
      };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await deckService.deleteDeck(mockDeck.id);

      expect(apiClient.patch).toHaveBeenCalledWith(`/decks/${mockDeck.id}`);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle not found error when deleting non-existent deck', async () => {
      const errorMessage = 'Deck not found';
      (apiClient.patch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(deckService.deleteDeck('non-existent-id')).rejects.toThrow(errorMessage);
    });

    it('should handle permission error when deleting deck owned by another user', async () => {
      const errorMessage = 'You do not have permission to delete this deck';
      (apiClient.patch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(deckService.deleteDeck(mockDeck.id)).rejects.toThrow(errorMessage);
    });
  });
});
