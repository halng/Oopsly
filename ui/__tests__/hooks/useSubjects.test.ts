import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSubject,
  useCreateSubject,
  useUpdateSubject,
  useUpdateSubjectSettings,
  useDeleteSubject,
} from '../../hooks/queries/useSubjects';
import * as SubjectService from '../../services/SubjectService';
import Toast from 'react-native-toast-message';

jest.mock('../../services/SubjectService');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
// useShelves imports SHELVES_QUERY_KEY from useShelves, mock to avoid the circular dep
jest.mock('../../hooks/queries/useShelves', () => ({
  SHELVES_QUERY_KEY: ['shelves'],
}));

const mockGetById = SubjectService.getSubjectById as jest.Mock;
const mockCreate = SubjectService.createSubject as jest.Mock;
const mockUpdate = SubjectService.updateSubjectById as jest.Mock;
const mockUpdateSettings = SubjectService.updateSubjectSetting as jest.Mock;
const mockDelete = SubjectService.deleteSubject as jest.Mock;

const SHELF_ID = 'shelf-1';
const SUBJ_ID = 'subj-1';

const subject = {
  id: SUBJ_ID,
  name: 'Anatomy',
  description: 'Human anatomy',
  shelfId: SHELF_ID,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSubjects Hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('useSubject (query by id)', () => {
    it('fetches a subject by shelf and subject ID', async () => {
      mockGetById.mockResolvedValue({ isSuccess: true, data: subject, message: 'ok' });

      const { result } = renderHook(() => useSubject(SHELF_ID, SUBJ_ID), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('Anatomy');
    });

    it('is disabled when shelfId is empty', () => {
      const { result } = renderHook(() => useSubject('', SUBJ_ID), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is disabled when subjectId is empty', () => {
      const { result } = renderHook(() => useSubject(SHELF_ID, ''), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('enters error state when API fails', async () => {
      mockGetById.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useSubject(SHELF_ID, 'bad-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateSubject (mutation)', () => {
    it('creates a subject and shows success Toast', async () => {
      mockCreate.mockResolvedValue({ isSuccess: true, data: subject, message: 'Created' });

      const { result } = renderHook(() => useCreateSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, data: { name: 'Anatomy' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Subject created successfully' })
      );
    });

    it('shows error Toast on failure', async () => {
      mockCreate.mockResolvedValue({ isSuccess: false, data: null, message: 'Duplicate name' });

      const { result } = renderHook(() => useCreateSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, data: { name: 'Existing' } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to create subject' })
      );
    });
  });

  describe('useUpdateSubject (mutation)', () => {
    it('updates a subject and shows success Toast', async () => {
      mockUpdate.mockResolvedValue({
        isSuccess: true,
        data: { ...subject, name: 'Updated Anatomy' },
        message: 'Updated',
      });

      const { result } = renderHook(() => useUpdateSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: SUBJ_ID, data: { name: 'Updated Anatomy' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Subject updated successfully' })
      );
    });

    it('shows error Toast when not found', async () => {
      mockUpdate.mockResolvedValue({ isSuccess: false, data: null, message: 'Not found' });

      const { result } = renderHook(() => useUpdateSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: 'ghost', data: { name: 'X' } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useUpdateSubjectSettings (mutation)', () => {
    it('updates settings and shows success Toast', async () => {
      mockUpdateSettings.mockResolvedValue({ isSuccess: true, data: subject, message: 'Updated' });

      const { result } = renderHook(() => useUpdateSubjectSettings(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          shelfId: SHELF_ID,
          id: SUBJ_ID,
          data: { maxCardsPerSession: 20, reviewIntervalDays: 1 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Subject settings updated' })
      );
    });
  });

  describe('useDeleteSubject (mutation)', () => {
    it('deletes a subject and shows success Toast', async () => {
      mockDelete.mockResolvedValue({ isSuccess: true, data: null, message: 'Deleted' });

      const { result } = renderHook(() => useDeleteSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: SUBJ_ID });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Subject deleted successfully' })
      );
    });

    it('shows error Toast when deletion fails', async () => {
      mockDelete.mockResolvedValue({ isSuccess: false, data: null, message: 'Cannot delete' });

      const { result } = renderHook(() => useDeleteSubject(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ shelfId: SHELF_ID, id: SUBJ_ID });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Failed to delete subject' })
      );
    });
  });
});
