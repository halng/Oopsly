import { apiClient } from '../../services';
import {
  fetchQuestionsByTestSuite,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../../services/QuestionService';
import { QuestionType } from '../../types/Question';

jest.mock('../../services', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiGet = apiClient.get as jest.Mock;
const mockApiPost = apiClient.post as jest.Mock;
const mockApiPut = apiClient.put as jest.Mock;
const mockApiDelete = apiClient.delete as jest.Mock;

const makeResponse = (data: unknown, isSuccess = true, message = 'Success') => ({
  data: { isSuccess, message, data },
});

const TS_ID = 'ts-abc';
const Q_ID = 'q-xyz';

const singleChoiceQ = {
  id: Q_ID,
  testSuiteId: TS_ID,
  content: 'What is the capital of France?',
  type: QuestionType.SINGLE_CHOICE,
  options: ['Berlin', 'Paris', 'Madrid', 'Rome'],
  correctOptionIndices: [1],
  explanation: 'Paris is the capital of France.',
};

const multiChoiceQ = {
  id: 'q-multi',
  testSuiteId: TS_ID,
  content: 'Select all prime numbers.',
  type: QuestionType.MULTIPLE_CHOICE,
  options: ['1', '2', '3', '4'],
  correctOptionIndices: [1, 2],
};

const trueFalseQ = {
  id: 'q-tf',
  testSuiteId: TS_ID,
  content: 'The Earth is flat.',
  type: QuestionType.TRUE_FALSE,
  options: ['True', 'False'],
  correctOptionIndices: [1],
};

const fillBlankQ = {
  id: 'q-fill',
  testSuiteId: TS_ID,
  content: 'The powerhouse of the cell is the ___.',
  type: QuestionType.FILL_IN_THE_BLANK,
  options: ['mitochondria'],
  correctOptionIndices: [],
};

describe('QuestionService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── fetchQuestionsByTestSuite ────────────────────────────────────────────
  describe('fetchQuestionsByTestSuite', () => {
    it('fetches all questions for a test suite', async () => {
      const questions = [singleChoiceQ, multiChoiceQ, trueFalseQ, fillBlankQ];
      mockApiGet.mockResolvedValue(makeResponse(questions));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      expect(mockApiGet).toHaveBeenCalledWith(`/test-suites/${TS_ID}/questions`);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('fetches SINGLE_CHOICE question with correct shape', async () => {
      mockApiGet.mockResolvedValue(makeResponse([singleChoiceQ]));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      const q = result.data[0];
      expect(q.type).toBe(QuestionType.SINGLE_CHOICE);
      expect(q.correctOptionIndices).toEqual([1]);
      expect(q.options).toHaveLength(4);
    });

    it('fetches MULTIPLE_CHOICE question with multiple correct indices', async () => {
      mockApiGet.mockResolvedValue(makeResponse([multiChoiceQ]));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      const q = result.data[0];
      expect(q.type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(q.correctOptionIndices).toEqual([1, 2]);
    });

    it('fetches TRUE_FALSE question with 2 options', async () => {
      mockApiGet.mockResolvedValue(makeResponse([trueFalseQ]));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      const q = result.data[0];
      expect(q.type).toBe(QuestionType.TRUE_FALSE);
      expect(q.options).toEqual(['True', 'False']);
    });

    it('fetches FILL_IN_THE_BLANK question with empty correctOptionIndices', async () => {
      mockApiGet.mockResolvedValue(makeResponse([fillBlankQ]));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      const q = result.data[0];
      expect(q.type).toBe(QuestionType.FILL_IN_THE_BLANK);
      expect(q.correctOptionIndices).toHaveLength(0);
      expect(q.options[0]).toBe('mitochondria');
    });

    it('returns empty array when no questions', async () => {
      mockApiGet.mockResolvedValue(makeResponse([]));

      const result = await fetchQuestionsByTestSuite(TS_ID);

      expect(result.data).toHaveLength(0);
    });

    it('propagates network error', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      await expect(fetchQuestionsByTestSuite(TS_ID)).rejects.toThrow('Network error');
    });
  });

  // ─── createQuestion ───────────────────────────────────────────────────────
  describe('createQuestion', () => {
    it('creates a SINGLE_CHOICE question', async () => {
      mockApiPost.mockResolvedValue(makeResponse(singleChoiceQ, true, 'Created'));

      const result = await createQuestion(TS_ID, {
        content: singleChoiceQ.content,
        type: QuestionType.SINGLE_CHOICE,
        options: singleChoiceQ.options,
        correctOptionIndices: [1],
        explanation: 'Paris is the capital.',
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        `/test-suites/${TS_ID}/questions`,
        expect.objectContaining({ type: QuestionType.SINGLE_CHOICE })
      );
      expect(result.isSuccess).toBe(true);
    });

    it('creates a MULTIPLE_CHOICE question', async () => {
      mockApiPost.mockResolvedValue(makeResponse(multiChoiceQ, true, 'Created'));

      const result = await createQuestion(TS_ID, {
        content: multiChoiceQ.content,
        type: QuestionType.MULTIPLE_CHOICE,
        options: multiChoiceQ.options,
        correctOptionIndices: [1, 2],
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        `/test-suites/${TS_ID}/questions`,
        expect.objectContaining({
          type: QuestionType.MULTIPLE_CHOICE,
          correctOptionIndices: [1, 2],
        })
      );
      expect(result.data.type).toBe(QuestionType.MULTIPLE_CHOICE);
    });

    it('creates a TRUE_FALSE question', async () => {
      mockApiPost.mockResolvedValue(makeResponse(trueFalseQ, true, 'Created'));

      const result = await createQuestion(TS_ID, {
        content: trueFalseQ.content,
        type: QuestionType.TRUE_FALSE,
        options: ['True', 'False'],
        correctOptionIndices: [1],
      });

      expect(result.data.options).toEqual(['True', 'False']);
    });

    it('creates a FILL_IN_THE_BLANK question', async () => {
      mockApiPost.mockResolvedValue(makeResponse(fillBlankQ, true, 'Created'));

      const result = await createQuestion(TS_ID, {
        content: fillBlankQ.content,
        type: QuestionType.FILL_IN_THE_BLANK,
        options: ['mitochondria'],
        correctOptionIndices: [],
      });

      expect(result.data.type).toBe(QuestionType.FILL_IN_THE_BLANK);
      expect(result.data.options[0]).toBe('mitochondria');
    });

    it('propagates error on create', async () => {
      mockApiPost.mockRejectedValue(new Error('Validation error'));

      await expect(
        createQuestion(TS_ID, {
          content: '',
          type: QuestionType.SINGLE_CHOICE,
          options: ['A', 'B'],
          correctOptionIndices: [0],
        })
      ).rejects.toThrow('Validation error');
    });
  });

  // ─── updateQuestion ────────────────────────────────────────────────────────
  describe('updateQuestion', () => {
    it('updates a question content', async () => {
      const updated = { ...singleChoiceQ, content: 'Updated question?' };
      mockApiPut.mockResolvedValue(makeResponse(updated));

      const result = await updateQuestion(TS_ID, Q_ID, {
        content: 'Updated question?',
        type: QuestionType.SINGLE_CHOICE,
        options: singleChoiceQ.options,
        correctOptionIndices: [1],
      });

      expect(mockApiPut).toHaveBeenCalledWith(
        `/test-suites/${TS_ID}/questions/${Q_ID}`,
        expect.objectContaining({ content: 'Updated question?' })
      );
      expect(result.data.content).toBe('Updated question?');
    });

    it('updates question type from SINGLE to MULTIPLE_CHOICE', async () => {
      const updated = { ...singleChoiceQ, type: QuestionType.MULTIPLE_CHOICE, correctOptionIndices: [0, 2] };
      mockApiPut.mockResolvedValue(makeResponse(updated));

      const result = await updateQuestion(TS_ID, Q_ID, {
        content: singleChoiceQ.content,
        type: QuestionType.MULTIPLE_CHOICE,
        options: singleChoiceQ.options,
        correctOptionIndices: [0, 2],
      });

      expect(result.data.type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(result.data.correctOptionIndices).toEqual([0, 2]);
    });

    it('propagates update error', async () => {
      mockApiPut.mockRejectedValue(new Error('Not found'));

      await expect(
        updateQuestion(TS_ID, 'bad-id', {
          content: 'x',
          type: QuestionType.TRUE_FALSE,
          options: ['True', 'False'],
          correctOptionIndices: [0],
        })
      ).rejects.toThrow('Not found');
    });
  });

  // ─── deleteQuestion ────────────────────────────────────────────────────────
  describe('deleteQuestion', () => {
    it('deletes a question successfully', async () => {
      mockApiDelete.mockResolvedValue(makeResponse(null, true, 'Deleted'));

      const result = await deleteQuestion(TS_ID, Q_ID);

      expect(mockApiDelete).toHaveBeenCalledWith(`/test-suites/${TS_ID}/questions/${Q_ID}`);
      expect(result.isSuccess).toBe(true);
    });

    it('handles not found when deleting', async () => {
      mockApiDelete.mockResolvedValue(makeResponse(null, false, 'Question not found'));

      const result = await deleteQuestion(TS_ID, 'ghost-id');

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Question not found');
    });

    it('propagates server error on delete', async () => {
      mockApiDelete.mockRejectedValue(new Error('Server error'));

      await expect(deleteQuestion(TS_ID, Q_ID)).rejects.toThrow('Server error');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('handles very long question content', async () => {
      const longContent = 'x'.repeat(2000);
      mockApiPost.mockResolvedValue(makeResponse(null, false, 'Content too long'));

      const result = await createQuestion(TS_ID, {
        content: longContent,
        type: QuestionType.SINGLE_CHOICE,
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndices: [0],
      });

      expect(result.isSuccess).toBe(false);
    });

    it('handles unauthorized access', async () => {
      const err = new Error('Unauthorized');
      err.name = 'UnauthorizedError';
      mockApiGet.mockRejectedValue(err);

      await expect(fetchQuestionsByTestSuite(TS_ID)).rejects.toThrow('Unauthorized');
    });

    it('handles empty options array for non-fill-in-blank', async () => {
      mockApiPost.mockResolvedValue(makeResponse(null, false, 'Options required'));

      const result = await createQuestion(TS_ID, {
        content: 'What?',
        type: QuestionType.SINGLE_CHOICE,
        options: [],
        correctOptionIndices: [],
      });

      expect(result.isSuccess).toBe(false);
    });
  });
});
