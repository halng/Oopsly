import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useTestSuites,
  useTestSuiteCards,
  useCreateTestSuite,
  useDeleteTestSuite,
} from '../../hooks/queries/useTestSuites';
import * as TestSuiteService from '../../services/TestSuiteService';
import Toast from 'react-native-toast-message';

jest.mock('../../services/TestSuiteService');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockFetch = TestSuiteService.fetchTestSuitesByShelf as jest.Mock;
const mockCreate = TestSuiteService.createTestSuite as jest.Mock;
const mockDelete = TestSuiteService.deleteTestSuite as jest.Mock;
const mockFetchCards = TestSuiteService.getCardsForTestSuite as jest.Mock;

const SHELF_ID = 'shelf-abc';
const TS_ID = 'ts-xyz';

const suites = [
  { id: TS_ID, title: 'Midterm', isActive: true },
  { id: 'ts-2', title: 'Final', isActive: false },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTestSuites', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('useTestSuites (query)', () => {
    it('fetches test suites for a given shelfId', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: suites, message: 'ok' });

      const { result } = renderHook(() => useTestSuites(SHELF_ID), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].title).toBe('Midterm');
    });

    it('is disabled when shelfId is empty', () => {
      const { result } = renderHook(() => useTestSuites(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('enters error state when API returns failure', async () => {
      mockFetch.mockResolvedValue({ isSuccess: false, data: null, message: 'Unauthorized' });

      const { result } = renderHook(() => useTestSuites(SHELF_ID), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe('Unauthorized');
    });

    it('returns empty array when no suites exist', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: [], message: 'ok' });

      const { result } = renderHook(() => useTestSuites(SHELF_ID), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(0);
    });
  });

  describe('useTestSuiteCards (query)', () => {
    it('fetches cards for a test suite', async () => {
      const cards = [{ id: 'c-1', front: 'Q', back: 'A' }];
      mockFetchCards.mockResolvedValue({ isSuccess: true, data: cards, message: 'ok' });

      const { result } = renderHook(() => useTestSuiteCards(TS_ID), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('is disabled when testSuiteId is empty', () => {
      const { result } = renderHook(() => useTestSuiteCards(''), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreateTestSuite (mutation)', () => {
    it('shows success Toast and returns created test suite', async () => {
      const created = { id: 'ts-new', title: 'Quiz', isActive: true };
      mockCreate.mockResolvedValue({ isSuccess: true, data: created, message: 'Created' });

      const { result } = renderHook(() => useCreateTestSuite(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, data: { title: 'Quiz' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Test suite created successfully' })
      );
    });

    it('shows error Toast on creation failure', async () => {
      mockCreate.mockResolvedValue({ isSuccess: false, data: null, message: 'Duplicate title' });

      const { result } = renderHook(() => useCreateTestSuite(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, data: { title: 'Duplicate' } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to create test suite' })
      );
    });
  });

  describe('useDeleteTestSuite (mutation)', () => {
    it('shows success Toast after deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: true, data: null, message: 'Deleted' });

      const { result } = renderHook(() => useDeleteTestSuite(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: TS_ID });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Test suite deleted successfully' })
      );
    });

    it('shows error Toast when deletion fails', async () => {
      mockDelete.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useDeleteTestSuite(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: 'ghost' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to delete test suite' })
      );
    });
  });
});
