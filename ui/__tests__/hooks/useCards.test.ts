import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCards,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  useReviewFlashcards,
} from '../../hooks/queries/useCards';
import * as CardService from '../../services/CardService';
import Toast from 'react-native-toast-message';

jest.mock('../../services/CardService');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockFetch = CardService.fetchCardsDataBySubjectAndShelf as jest.Mock;
const mockCreate = CardService.createNewCard as jest.Mock;
const mockUpdate = CardService.updateCard as jest.Mock;
const mockDelete = CardService.deleteCard as jest.Mock;
const mockReview = CardService.updateDifficultyLevels as jest.Mock;

const SHELF_ID = 'shelf-1';
const SUBJ_ID = 'subj-1';
const CARD_ID = 'card-1';

const cards = [
  { id: CARD_ID, front: 'What is DNA?', back: 'Deoxyribonucleic acid' },
  { id: 'card-2', front: 'What is RNA?', back: 'Ribonucleic acid' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCards Hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('useCards (query)', () => {
    it('fetches cards for a subject', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: cards, message: 'ok' });

      const { result } = renderHook(() => useCards(SHELF_ID, SUBJ_ID), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].front).toBe('What is DNA?');
    });

    it('is disabled when shelfId is empty', () => {
      const { result } = renderHook(() => useCards('', SUBJ_ID), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is disabled when subjectId is empty', () => {
      const { result } = renderHook(() => useCards(SHELF_ID, ''), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('enters error state when API fails', async () => {
      mockFetch.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useCards(SHELF_ID, SUBJ_ID), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateCard (mutation)', () => {
    it('creates cards and shows success Toast', async () => {
      mockCreate.mockResolvedValue({ isSuccess: true, data: cards, message: 'Created' });

      const { result } = renderHook(() => useCreateCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          subjectId: SUBJ_ID,
          cards: [{ front: 'Q1', back: 'A1' }],
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Card(s) created successfully' })
      );
    });

    it('shows error Toast on failure', async () => {
      mockCreate.mockResolvedValue({ isSuccess: false, data: null, message: 'Limit exceeded' });

      const { result } = renderHook(() => useCreateCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, subjectId: SUBJ_ID, cards: [] });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to create card(s)' })
      );
    });
  });

  describe('useUpdateCard (mutation)', () => {
    it('updates a card and shows success Toast', async () => {
      mockUpdate.mockResolvedValue({
        isSuccess: true,
        data: { ...cards[0], front: 'Updated Q' },
        message: 'Updated',
      });

      const { result } = renderHook(() => useUpdateCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          subjectId: SUBJ_ID,
          cardId: CARD_ID,
          data: { front: 'Updated Q', back: 'A1' },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Card updated successfully' })
      );
    });

    it('shows error Toast on failed update', async () => {
      mockUpdate.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useUpdateCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          subjectId: SUBJ_ID,
          cardId: 'ghost',
          data: { front: 'x', back: 'y' },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteCard (mutation)', () => {
    it('deletes a card and shows success Toast', async () => {
      mockDelete.mockResolvedValue({ isSuccess: true, data: null, message: 'Deleted' });

      const { result } = renderHook(() => useDeleteCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, subjectId: SUBJ_ID, cardId: CARD_ID });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Card deleted successfully' })
      );
    });

    it('shows error Toast on failed deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useDeleteCard(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, subjectId: SUBJ_ID, cardId: 'ghost' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useReviewFlashcards (mutation)', () => {
    it('submits review results silently (no Toast on success)', async () => {
      mockReview.mockResolvedValue({ isSuccess: true, data: null, message: 'ok' });

      const { result } = renderHook(() => useReviewFlashcards(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          subjectId: SUBJ_ID,
          reviews: [{ cardId: CARD_ID, difficulty: 'EASY' }],
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // useReviewFlashcards intentionally does NOT show a toast on success
      expect(Toast.show).not.toHaveBeenCalled();
    });

    it('shows error Toast when review sync fails', async () => {
      mockReview.mockResolvedValue({ isSuccess: false, data: null, message: 'Sync failed' });

      const { result } = renderHook(() => useReviewFlashcards(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          subjectId: SUBJ_ID,
          reviews: [{ cardId: CARD_ID, difficulty: 'HARD' }],
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to sync review results' })
      );
    });
  });
});
