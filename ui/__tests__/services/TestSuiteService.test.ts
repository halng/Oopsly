import { apiClient } from '../../services';
import {
  fetchTestSuitesByShelf,
  createTestSuite,
  deleteTestSuite,
  getCardsForTestSuite,
} from '../../services/TestSuiteService';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiGet = apiClient.get as jest.Mock;
const mockApiPost = apiClient.post as jest.Mock;
const mockApiDelete = apiClient.delete as jest.Mock;

const makeResponse = (data: unknown, isSuccess = true, message = 'Success') => ({
  data: { isSuccess, message, data },
});

describe('TestSuiteService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── fetchTestSuitesByShelf ───────────────────────────────────────────────
  describe('fetchTestSuitesByShelf', () => {
    it('returns list of test suites for a shelf', async () => {
      const suites = [
        { id: 'ts-1', title: 'Midterm', isActive: true },
        { id: 'ts-2', title: 'Final', isActive: false },
      ];
      mockApiGet.mockResolvedValue(makeResponse(suites));

      const result = await fetchTestSuitesByShelf('shelf-1');

      expect(mockApiGet).toHaveBeenCalledWith('/shelves/shelf-1/test-suites');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe('Midterm');
    });

    it('returns an empty array when no test suites exist', async () => {
      mockApiGet.mockResolvedValue(makeResponse([]));

      const result = await fetchTestSuitesByShelf('shelf-empty');

      expect(result.data).toHaveLength(0);
    });

    it('propagates network error', async () => {
      mockApiGet.mockRejectedValue(new Error('Network down'));

      await expect(fetchTestSuitesByShelf('shelf-1')).rejects.toThrow('Network down');
    });

    it('propagates timeout error', async () => {
      const err = new Error('Timeout');
      err.name = 'TimeoutError';
      mockApiGet.mockRejectedValue(err);

      await expect(fetchTestSuitesByShelf('shelf-1')).rejects.toThrow('Timeout');
    });
  });

  // ─── createTestSuite ─────────────────────────────────────────────────────
  describe('createTestSuite', () => {
    it('creates a test suite with defaults when optional fields omitted', async () => {
      const created = { id: 'ts-new', title: 'Quiz', isActive: true };
      mockApiPost.mockResolvedValue(makeResponse(created, true, 'Created'));

      const result = await createTestSuite('shelf-1', { title: 'Quiz' });

      expect(mockApiPost).toHaveBeenCalledWith('/shelves/shelf-1/test-suites', {
        title: 'Quiz',
        isActive: true,
        subjectIds: [],
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data.id).toBe('ts-new');
    });

    it('creates with isActive = false and explicit subjectIds', async () => {
      const created = { id: 'ts-x', title: 'Test', isActive: false };
      mockApiPost.mockResolvedValue(makeResponse(created));

      const result = await createTestSuite('shelf-1', {
        title: 'Test',
        isActive: false,
        subjectIds: ['subj-1', 'subj-2'],
      });

      expect(mockApiPost).toHaveBeenCalledWith('/shelves/shelf-1/test-suites', {
        title: 'Test',
        isActive: false,
        subjectIds: ['subj-1', 'subj-2'],
      });
      expect(result.data.isActive).toBe(false);
    });

    it('propagates server error on create', async () => {
      mockApiPost.mockRejectedValue(new Error('Validation failed'));

      await expect(createTestSuite('shelf-1', { title: '' })).rejects.toThrow('Validation failed');
    });

    it('handles 500 server error', async () => {
      mockApiPost.mockRejectedValue(new Error('Internal Server Error'));

      await expect(createTestSuite('shelf-1', { title: 'Crash' })).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  // ─── deleteTestSuite ─────────────────────────────────────────────────────
  describe('deleteTestSuite', () => {
    it('deletes a test suite successfully', async () => {
      mockApiDelete.mockResolvedValue(makeResponse(null, true, 'Deleted'));

      const result = await deleteTestSuite('shelf-1', 'ts-1');

      expect(mockApiDelete).toHaveBeenCalledWith('/shelves/shelf-1/test-suites/ts-1');
      expect(result.isSuccess).toBe(true);
    });

    it('returns failure when test suite not found', async () => {
      mockApiDelete.mockResolvedValue(makeResponse(null, false, 'Not found'));

      const result = await deleteTestSuite('shelf-1', 'non-existent');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Not found');
    });

    it('propagates error when delete fails', async () => {
      mockApiDelete.mockRejectedValue(new Error('Unauthorized'));

      await expect(deleteTestSuite('shelf-1', 'ts-1')).rejects.toThrow('Unauthorized');
    });
  });

  // ─── getCardsForTestSuite ────────────────────────────────────────────────
  describe('getCardsForTestSuite', () => {
    it('returns cards linked to a test suite', async () => {
      const cards = [
        { id: 'c-1', front: 'Q1', back: 'A1' },
        { id: 'c-2', front: 'Q2', back: 'A2' },
      ];
      mockApiGet.mockResolvedValue(makeResponse(cards));

      const result = await getCardsForTestSuite('ts-1');

      expect(mockApiGet).toHaveBeenCalledWith('/test-suites/ts-1/cards');
      expect(result.data).toHaveLength(2);
    });

    it('returns empty when no cards linked', async () => {
      mockApiGet.mockResolvedValue(makeResponse([]));

      const result = await getCardsForTestSuite('ts-empty');

      expect(result.data).toHaveLength(0);
    });

    it('propagates error', async () => {
      mockApiGet.mockRejectedValue(new Error('Not found'));

      await expect(getCardsForTestSuite('invalid-id')).rejects.toThrow('Not found');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('handles shelf ID with special characters', async () => {
      mockApiGet.mockResolvedValue(makeResponse([]));

      await fetchTestSuitesByShelf('shelf/test&1');

      expect(mockApiGet).toHaveBeenCalledWith('/shelves/shelf/test&1/test-suites');
    });

    it('handles very long title', async () => {
      const longTitle = 'A'.repeat(500);
      mockApiPost.mockResolvedValue(makeResponse(null, false, 'Title too long'));

      const result = await createTestSuite('shelf-1', { title: longTitle });

      expect(result.isSuccess).toBe(false);
    });

    it('handles simultaneous deletions (idempotent)', async () => {
      mockApiDelete.mockResolvedValue(makeResponse(null, true, 'Already deleted'));

      const r1 = await deleteTestSuite('shelf-1', 'ts-1');
      const r2 = await deleteTestSuite('shelf-1', 'ts-1');

      expect(r1.isSuccess).toBe(true);
      expect(r2.isSuccess).toBe(true);
    });
  });
});
