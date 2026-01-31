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

import { apiClient } from '@/services';
import { DeckService } from '@/services/DeckService';
import { Deck, CreateDeckVm, UpdateDeckVm } from '@/types/Deck';

jest.mock('@/services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('DeckService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDecks', () => {
    it('should successfully fetch all decks', async () => {
      const mockDecks: Deck[] = [
        {
          id: '1',
          title: 'Japanese Vocabulary',
          description: 'Basic Japanese words',
          createdAt: '2025-12-14T10:00:00.000Z',
        },
        {
          id: '2',
          title: 'Math Formulas',
          description: 'Important formulas',
          createdAt: '2025-12-14T11:00:00.000Z',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDecks });

      const result = await DeckService.fetchDecks();

      expect(apiClient.get).toHaveBeenCalledWith('/decks');
      expect(result).toEqual(mockDecks);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no decks exist', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await DeckService.fetchDecks();

      expect(apiClient.get).toHaveBeenCalledWith('/decks');
      expect(result).toEqual([]);
    });

    it('should handle error when fetching decks fails', async () => {
      const errorMessage = 'Failed to fetch decks';
      (apiClient.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(DeckService.fetchDecks()).rejects.toThrow(errorMessage);
      expect(apiClient.get).toHaveBeenCalledWith('/decks');
    });
  });

  describe('createDeck', () => {
    const mockCreateData: CreateDeckVm = {
      title: 'New Deck',
      description: 'New deck description',
    };

    it('should successfully create a new deck', async () => {
      const mockCreatedDeck: Deck = {
        id: '123',
        ...mockCreateData,
        createdAt: '2025-12-14T10:00:00.000Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockCreatedDeck });

      const result = await DeckService.createDeck(mockCreateData);

      expect(apiClient.post).toHaveBeenCalledWith('/decks', mockCreateData);
      expect(result).toEqual(mockCreatedDeck);
      expect(result.id).toBe('123');
    });

    it('should handle error when creating deck fails', async () => {
      const errorMessage = 'Failed to create deck';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(DeckService.createDeck(mockCreateData)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith('/decks', mockCreateData);
    });
  });

  describe('updateDeck', () => {
    const mockUpdateData: UpdateDeckVm = {
      title: 'Updated Deck',
      description: 'Updated description',
    };

    it('should successfully update a deck', async () => {
      const deckId = '123';
      const mockUpdatedDeck: Deck = {
        id: deckId,
        ...mockUpdateData,
        updatedAt: '2025-12-14T12:00:00.000Z',
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockUpdatedDeck });

      const result = await DeckService.updateDeck(deckId, mockUpdateData);

      expect(apiClient.put).toHaveBeenCalledWith(`/decks/${deckId}`, mockUpdateData);
      expect(result).toEqual(mockUpdatedDeck);
    });

    it('should handle error when updating deck fails', async () => {
      const deckId = '123';
      const errorMessage = 'Failed to update deck';
      (apiClient.put as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(DeckService.updateDeck(deckId, mockUpdateData)).rejects.toThrow(errorMessage);
      expect(apiClient.put).toHaveBeenCalledWith(`/decks/${deckId}`, mockUpdateData);
    });
  });

  describe('deleteDeck', () => {
    it('should successfully delete a deck', async () => {
      const deckId = '123';
      (apiClient.patch as jest.Mock).mockResolvedValue({});

      await DeckService.deleteDeck(deckId);

      expect(apiClient.patch).toHaveBeenCalledWith(`/decks/${deckId}`);
    });

    it('should handle error when deleting deck fails', async () => {
      const deckId = '123';
      const errorMessage = 'Failed to delete deck';
      (apiClient.patch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(DeckService.deleteDeck(deckId)).rejects.toThrow(errorMessage);
      expect(apiClient.patch).toHaveBeenCalledWith(`/decks/${deckId}`);
    });
  });
});
