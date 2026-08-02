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
  fetchCardsDataBySubjectAndShelf,
  createNewCard,
  updateCard,
  deleteCard,
  updateDifficultyLevels,
} from '../../services/CardService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('CardService', () => {
  const shelfId = 'shelf-123';
  const subjectId = 'subject-456';
  const cardId = 'card-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCardsDataBySubjectAndShelf', () => {
    it('fetches cards successfully', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: {
            entities: [
              { id: '1', front: 'Question 1', back: 'Answer 1' },
              { id: '2', front: 'Question 2', back: 'Answer 2' },
            ],
            totalElements: 2,
            totalPages: 1,
            currentPage: 0,
            pageSize: 1000,
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchCardsDataBySubjectAndShelf(shelfId, subjectId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards`,
        {
          params: {
            page: 0,
            size: 1000,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles fetch error', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(
        fetchCardsDataBySubjectAndShelf(shelfId, subjectId)
      ).rejects.toThrow('Network error');
    });
  });

  describe('createNewCard', () => {
    it('creates new cards successfully', async () => {
      const cards = [
        { front: 'Question 1', back: 'Answer 1' },
        { front: 'Question 2', back: 'Answer 2' },
      ];

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Cards created successfully',
          data: { count: 2 },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createNewCard(shelfId, subjectId, cards);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards`,
        { cards }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles create error', async () => {
      const cards = [{ front: 'Question', back: 'Answer' }];
      const error = new Error('Creation failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        createNewCard(shelfId, subjectId, cards)
      ).rejects.toThrow('Creation failed');
    });

    it('creates single card', async () => {
      const cards = [{ front: 'Single Question', back: 'Single Answer' }];

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Card created successfully',
          data: { count: 1 },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createNewCard(shelfId, subjectId, cards);

      expect(result.isSuccess).toBe(true);
      expect(result.data.count).toBe(1);
    });

    it('creates empty cards array', async () => {
      const cards: any[] = [];

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'No cards to create',
          data: { count: 0 },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createNewCard(shelfId, subjectId, cards);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards`,
        { cards: [] }
      );
      expect(result.data.count).toBe(0);
    });
  });

  describe('updateCard', () => {
    it('updates card successfully', async () => {
      const cardData = { front: 'Updated Question', back: 'Updated Answer' };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Card updated successfully',
          data: { id: cardId, ...cardData },
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateCard(shelfId, subjectId, cardId, cardData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards/${cardId}`,
        cardData
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles update error', async () => {
      const cardData = { front: 'Question', back: 'Answer' };
      const error = new Error('Update failed');
      (apiClient.put as jest.Mock).mockRejectedValue(error);

      await expect(
        updateCard(shelfId, subjectId, cardId, cardData)
      ).rejects.toThrow('Update failed');
    });

    it('updates card with empty fields', async () => {
      const cardData = { front: '', back: '' };

      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Validation error',
          data: null,
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateCard(shelfId, subjectId, cardId, cardData);

      expect(result.isSuccess).toBe(false);
    });
  });

  describe('deleteCard', () => {
    it('deletes card successfully', async () => {
      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Card deleted successfully',
          data: null,
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await deleteCard(shelfId, subjectId, cardId);

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards/${cardId}`
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles delete error', async () => {
      const error = new Error('Delete failed');
      (apiClient.patch as jest.Mock).mockRejectedValue(error);

      await expect(
        deleteCard(shelfId, subjectId, cardId)
      ).rejects.toThrow('Delete failed');
    });

    it('handles delete with non-existent card', async () => {
      const mockResponse = {
        data: {
          isSuccess: false,
          message: 'Card not found',
          data: null,
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await deleteCard(shelfId, 'invalid-subject', 'invalid-card');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Card not found');
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in IDs', async () => {
      const specialShelfId = 'shelf-@#$%';
      const specialSubjectId = 'subject-!&*()';

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Success',
          data: { entities: [], totalElements: 0 },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await fetchCardsDataBySubjectAndShelf(specialShelfId, specialSubjectId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/shelves/${specialShelfId}/subjects/${specialSubjectId}/cards`,
        expect.any(Object)
      );
    });

    it('handles very long card content', async () => {
      const longContent = 'A'.repeat(10000);
      const cardData = { front: longContent, back: longContent };

      const mockResponse = {
        data: {
          isSuccess: true,
          message: 'Card updated',
          data: cardData,
        },
      };

      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateCard(shelfId, subjectId, cardId, cardData);

      expect(result.isSuccess).toBe(true);
    });

    it('handles network timeout', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(
        fetchCardsDataBySubjectAndShelf(shelfId, subjectId)
      ).rejects.toThrow('Timeout');
    });
  });

  describe('updateDifficultyLevels', () => {
    it('updates reviewed flashcard difficulty', async () => {
      const reviewed = [
        { id: cardId, difficulty: 3, subjectId },
      ];
      const mockResponse = {
        data: { isSuccess: true, message: 'Updated', data: null },
      };
      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await updateDifficultyLevels(shelfId, subjectId, reviewed as any);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/shelves/${shelfId}/subjects/${subjectId}/cards/difficulty`,
        reviewed,
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});
