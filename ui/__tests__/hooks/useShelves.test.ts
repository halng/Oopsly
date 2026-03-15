import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useShelves,
  useShelf,
  useCreateShelf,
  useUpdateShelf,
  useDeleteShelf,
} from '../../hooks/queries/useShelves';
import * as ShelfService from '../../services/ShelfService';
import Toast from 'react-native-toast-message';

jest.mock('../../services/ShelfService');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockFetch = ShelfService.fetchShelves as jest.Mock;
const mockGetById = ShelfService.getShelfById as jest.Mock;
const mockCreate = ShelfService.createShelf as jest.Mock;
const mockUpdate = ShelfService.updateShelve as jest.Mock;
const mockDelete = ShelfService.deleteShelf as jest.Mock;

const shelves = {
  entities: [
    { id: 's-1', name: 'Medical School', icon: 'BookOpen', subjects: [] },
    { id: 's-2', name: 'Engineering', icon: 'Code', subjects: [] },
  ],
  totalElements: 2,
  totalPages: 1,
  currentPage: 0,
  pageSize: 10,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useShelves Hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('useShelves (query)', () => {
    it('fetches list of shelves', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: shelves, message: 'ok' });

      const { result } = renderHook(() => useShelves(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.entities).toHaveLength(2);
    });

    it('fetches shelves with pagination params', async () => {
      mockFetch.mockResolvedValue({ isSuccess: true, data: shelves, message: 'ok' });

      const { result } = renderHook(() => useShelves({ page: 1, size: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith({ page: 1, size: 5 });
    });

    it('enters error state when API fails', async () => {
      mockFetch.mockResolvedValue({ isSuccess: false, data: null, message: 'Server error' });

      const { result } = renderHook(() => useShelves(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useShelf (query by id)', () => {
    it('fetches a single shelf by ID', async () => {
      const shelf = { id: 's-1', name: 'Medical School', icon: 'BookOpen', subjects: [] };
      mockGetById.mockResolvedValue({ isSuccess: true, data: shelf, message: 'ok' });

      const { result } = renderHook(() => useShelf('s-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('Medical School');
    });

    it('is disabled when id is empty', () => {
      const { result } = renderHook(() => useShelf(''), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreateShelf (mutation)', () => {
    it('shows success Toast and invalidates cache', async () => {
      const created = { id: 's-new', name: 'Science', icon: 'Flask', subjects: [] };
      mockCreate.mockResolvedValue({ isSuccess: true, data: created, message: 'Created' });

      const { result } = renderHook(() => useCreateShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ name: 'Science', icon: 'Flask' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Shelf created successfully' })
      );
    });

    it('shows error Toast on creation failure', async () => {
      mockCreate.mockResolvedValue({ isSuccess: false, data: null, message: 'Name taken' });

      const { result } = renderHook(() => useCreateShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ name: 'Dupe', icon: 'Code' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to create shelf' })
      );
    });
  });

  describe('useUpdateShelf (mutation)', () => {
    it('shows success Toast on update', async () => {
      mockUpdate.mockResolvedValue({
        isSuccess: true,
        data: { id: 's-1', name: 'Updated', icon: 'Code', subjects: [] },
        message: 'Updated',
      });

      const { result } = renderHook(() => useUpdateShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 's-1', data: { name: 'Updated' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Shelf updated successfully' })
      );
    });

    it('shows error Toast when update fails', async () => {
      mockUpdate.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useUpdateShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'bad', data: { name: 'X' } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to update shelf' })
      );
    });
  });

  describe('useDeleteShelf (mutation)', () => {
    it('shows success Toast on deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: true, data: null, message: 'Deleted' });

      const { result } = renderHook(() => useDeleteShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate('s-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Shelf deleted successfully' })
      );
    });

    it('shows error Toast on failed deletion', async () => {
      mockDelete.mockResolvedValue({ isSuccess: false, data: null, message: 'Already deleted' });

      const { result } = renderHook(() => useDeleteShelf(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate('ghost');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to delete shelf' })
      );
    });
  });
});
