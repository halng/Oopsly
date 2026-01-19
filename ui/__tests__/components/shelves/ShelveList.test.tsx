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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { ShelveList } from '../../../components/shelves/ShelveList';
import { shelveService } from '../../../services/shelveService';
import { Shelve, ShelvePaginatedResponse } from '../../../types/Shelve';
import { ApiResponse } from '../../../types/api';

jest.mock('../../../services/shelveService', () => ({
  shelveService: {
    fetchShelves: jest.fn(),
    createShelve: jest.fn(),
    updateShelve: jest.fn(),
    deleteShelve: jest.fn(),
  },
}));

jest.spyOn(Alert, 'alert');

describe('ShelveList', () => {
  const mockShelves: Shelve[] = [
    {
      id: 'shelve-1',
      name: 'Japanese Vocabulary',
      description: 'Basic Japanese words for beginners',
      createdAt: '2025-12-14T10:00:00.000Z',
      updatedAt: '2025-12-14T15:30:00.000Z',
    },
    {
      id: 'shelve-2',
      name: 'Math Formulas',
      description: 'Essential math formulas',
      createdAt: '2025-12-13T10:00:00.000Z',
      updatedAt: '2025-12-13T10:00:00.000Z',
    },
  ];

  const mockPaginatedResponse: ApiResponse<ShelvePaginatedResponse> = {
    status: 200,
    message: 'Shelves retrieved successfully',
    data: {
      content: mockShelves,
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    },
    isSuccess: true,
    timestamp: '2025-12-14T23:00:00.000Z',
  };

  const mockEmptyResponse: ApiResponse<ShelvePaginatedResponse> = {
    status: 200,
    message: 'Shelves retrieved successfully',
    data: {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
    },
    isSuccess: true,
    timestamp: '2025-12-14T23:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (shelveService.fetchShelves as jest.Mock).mockResolvedValue(mockPaginatedResponse);
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching shelves', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: ApiResponse<ShelvePaginatedResponse>) => void;
      const pendingPromise = new Promise<ApiResponse<ShelvePaginatedResponse>>((resolve) => {
        resolvePromise = resolve;
      });
      (shelveService.fetchShelves as jest.Mock).mockReturnValue(pendingPromise);

      render(<ShelveList />);

      expect(screen.getByText('Loading shelves...')).toBeTruthy();

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockPaginatedResponse);
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no shelves exist', async () => {
      (shelveService.fetchShelves as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByText('No shelves yet')).toBeTruthy();
        expect(screen.getByText('Create your first shelve to start organizing your flashcards')).toBeTruthy();
        expect(screen.getByTestId('create-first-shelve-button')).toBeTruthy();
      });
    });

    it('opens create modal when "Create Your First Shelve" is pressed', async () => {
      (shelveService.fetchShelves as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('create-first-shelve-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('create-first-shelve-button'));

      await waitFor(() => {
        expect(screen.getByText('Create New Shelve')).toBeTruthy();
      });
    });
  });

  describe('Error State', () => {
    it('shows error state when fetch fails', async () => {
      (shelveService.fetchShelves as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('retries fetch when retry button is pressed', async () => {
      (shelveService.fetchShelves as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPaginatedResponse);

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(shelveService.fetchShelves).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });
    });

    it('shows generic error message when error is not an Error instance', async () => {
      (shelveService.fetchShelves as jest.Mock).mockRejectedValue('Something went wrong');

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch shelves')).toBeTruthy();
      });
    });
  });

  describe('Shelve List Display', () => {
    it('renders list of shelves correctly', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
        expect(screen.getByText('Math Formulas')).toBeTruthy();
      });
    });

    it('shows FAB when shelves exist', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-shelve')).toBeTruthy();
      });
    });

    it('does not show FAB when no shelves exist', async () => {
      (shelveService.fetchShelves as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.queryByTestId('fab-create-shelve')).toBeNull();
      });
    });

    it('calls onShelvePress when shelve card is pressed', async () => {
      const mockOnShelvePress = jest.fn();
      render(<ShelveList onShelvePress={mockOnShelvePress} />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-card-shelve-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-card-shelve-1'));

      expect(mockOnShelvePress).toHaveBeenCalledWith(mockShelves[0]);
    });
  });

  describe('Create Shelve', () => {
    it('opens create modal when FAB is pressed', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-shelve')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('fab-create-shelve'));

      await waitFor(() => {
        expect(screen.getByText('Create New Shelve')).toBeTruthy();
      });
    });

    it('creates shelve and refreshes list on successful creation', async () => {
      const newShelve: Shelve = {
        id: 'shelve-new',
        name: 'New Shelve',
        description: 'New description',
        createdAt: '2025-12-15T10:00:00.000Z',
        updatedAt: '2025-12-15T10:00:00.000Z',
      };

      (shelveService.createShelve as jest.Mock).mockResolvedValue({
        status: 201,
        message: 'Shelve created successfully',
        data: newShelve,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-shelve')).toBeTruthy();
      });

      // Open modal
      await act(async () => {
        fireEvent.press(screen.getByTestId('fab-create-shelve'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('shelve-name-input')).toBeTruthy();
      });

      // Fill form
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('shelve-name-input'), 'New Shelve');
        fireEvent.changeText(screen.getByTestId('shelve-description-input'), 'New description');
      });

      // Submit
      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-submit-button'));
      });

      await waitFor(() => {
        expect(shelveService.createShelve).toHaveBeenCalledWith({
          name: 'New Shelve',
          description: 'New description',
        });
      });

      // fetchShelves should be called again after creation (initial + after create)
      await waitFor(() => {
        expect(shelveService.fetchShelves).toHaveBeenCalledTimes(2);
      });
    });

    it('closes modal when cancel is pressed', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-shelve')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('fab-create-shelve'));

      await waitFor(() => {
        expect(screen.getByText('Create New Shelve')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('modal-cancel-button'));

      await waitFor(() => {
        expect(screen.queryByText('Create New Shelve')).toBeNull();
      });
    });
  });

  describe('Edit Shelve', () => {
    it('opens edit modal with pre-filled data when edit button is pressed', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-edit-shelve-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-edit-shelve-1'));

      await waitFor(() => {
        expect(screen.getByText('Edit Shelve')).toBeTruthy();
        const nameInput = screen.getByTestId('shelve-name-input');
        expect(nameInput.props.value).toBe('Japanese Vocabulary');
      });
    });

    it('updates shelve and refreshes list on successful update', async () => {
      const updatedShelve: Shelve = {
        ...mockShelves[0],
        name: 'Updated Name',
        description: 'Updated description',
      };

      (shelveService.updateShelve as jest.Mock).mockResolvedValue({
        status: 200,
        message: 'Shelve updated successfully',
        data: updatedShelve,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-edit-shelve-1')).toBeTruthy();
      });

      // Open edit modal
      fireEvent.press(screen.getByTestId('shelve-edit-shelve-1'));

      await waitFor(() => {
        expect(screen.getByTestId('shelve-name-input')).toBeTruthy();
      });

      // Update form
      fireEvent.changeText(screen.getByTestId('shelve-name-input'), 'Updated Name');

      // Submit
      fireEvent.press(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(shelveService.updateShelve).toHaveBeenCalledWith('shelve-1', {
          name: 'Updated Name',
          description: 'Basic Japanese words for beginners',
        });
      });
    });
  });

  describe('Delete Shelve', () => {
    it('shows confirmation dialog when delete button is pressed', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-delete-shelve-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-delete-shelve-1'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Shelve',
        'Are you sure you want to delete "Japanese Vocabulary"? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('deletes shelve with optimistic update when confirmed', async () => {
      (shelveService.deleteShelve as jest.Mock).mockResolvedValue({
        status: 200,
        message: 'Shelve deleted successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-delete-shelve-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-delete-shelve-1'));

      // Simulate pressing "Delete" in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      
      await act(async () => {
        await deleteButton.onPress();
      });

      expect(shelveService.deleteShelve).toHaveBeenCalledWith('shelve-1');
      
      // Shelve should be removed from UI (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('Japanese Vocabulary')).toBeNull();
      });
    });

    it('reverts optimistic update on delete failure', async () => {
      (shelveService.deleteShelve as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-delete-shelve-1'));

      // Simulate pressing "Delete" in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      
      await act(async () => {
        await deleteButton.onPress();
      });

      // Should show error alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Delete failed'
        );
      });

      // Shelve should be restored in UI
      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });
    });

    it('does nothing when cancel is pressed in delete confirmation', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-delete-shelve-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('shelve-delete-shelve-1'));

      // Verify shelve is still there
      expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      expect(shelveService.deleteShelve).not.toHaveBeenCalled();
    });
  });

  describe('Pull to Refresh', () => {
    it('refreshes shelve list when pull-to-refresh is triggered', async () => {
      render(<ShelveList />);

      await waitFor(() => {
        expect(screen.getByTestId('shelve-list')).toBeTruthy();
      });

      // Simulate pull-to-refresh
      const flatList = screen.getByTestId('shelve-list');
      const refreshControl = flatList.props.refreshControl;
      
      await act(async () => {
        refreshControl.props.onRefresh();
      });

      // fetchShelves should be called twice (initial + refresh)
      expect(shelveService.fetchShelves).toHaveBeenCalledTimes(2);
    });
  });
});
