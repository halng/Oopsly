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

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import DeckManagementScreen from '../../app/(user)/deck-management';
import { deckService } from '../../services/deckService';
import { ApiResponse } from '../../types/ApiRes';
import { Deck } from '../../types/Deck';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../services/deckService', () => ({
  deckService: {
    getDeckById: jest.fn(),
    updateDeck: jest.fn(),
    deleteDeck: jest.fn(),
  },
}));

jest.spyOn(Alert, 'alert');

describe('DeckManagementScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockDeck: Deck = {
    id: 'test-deck-id',
    name: 'Test Deck',
    description: 'Test Description',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  };

  const mockSuccessResponse: ApiResponse<Deck> = {
    status: 200,
    message: 'Success',
    data: mockDeck,
    isSuccess: true,
    timestamp: '2025-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'test-deck-id' });
  });

  describe('Loading State', () => {
    it('should display loading indicator while fetching deck', () => {
      (deckService.getDeckById as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<DeckManagementScreen />);

      expect(screen.getByText('Loading deck...')).toBeTruthy();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  describe('Success State', () => {
    it('should display deck data after successful fetch', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
        expect(screen.getByText('Test Description')).toBeTruthy();
      });
    });

    it('should display formatted dates', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Created:/)).toBeTruthy();
        expect(screen.getByText(/Updated:/)).toBeTruthy();
      });
    });

    it('should call getDeckById with correct deck ID', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(deckService.getDeckById).toHaveBeenCalledWith('test-deck-id');
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch deck';
      (deckService.getDeckById as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Deck')).toBeTruthy();
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
    });

    it('should show Go Back button in error state', async () => {
      (deckService.getDeckById as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<DeckManagementScreen />);

      await waitFor(() => {
        const goBackButton = screen.getByText('Go Back');
        expect(goBackButton).toBeTruthy();
      });
    });

    it('should navigate back when Go Back button is pressed', async () => {
      (deckService.getDeckById as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<DeckManagementScreen />);

      await waitFor(() => {
        const goBackButton = screen.getByText('Go Back');
        fireEvent.press(goBackButton);
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it('should display "Deck Not Found" when deckData is null', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue({
        ...mockSuccessResponse,
        isSuccess: false,
      });

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Deck Not Found')).toBeTruthy();
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should enter edit mode when Edit button is pressed', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toBeTruthy();
        expect(screen.getByTestId('cancel-button')).toBeTruthy();
      });
    });

    it('should populate edit fields with current deck data', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Deck name');
        const descriptionInput = screen.getByPlaceholderText('Deck description');
        
        expect(nameInput.props.value).toBe('Test Deck');
        expect(descriptionInput.props.value).toBe('Test Description');
      });
    });

    it('should cancel edit mode when Cancel button is pressed', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const cancelButton = screen.getByTestId('cancel-button');
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('save-button')).toBeNull();
      });
    });
  });

  describe('Update Functionality', () => {
    it('should validate empty deck name', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Deck name');
        fireEvent.changeText(nameInput, '   ');
        
        const saveButton = screen.getByTestId('save-button');
        fireEvent.press(saveButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith('Validation Error', 'Deck name cannot be empty');
    });

    it('should call updateDeck service with correct data', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (deckService.updateDeck as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Deck name');
        const descriptionInput = screen.getByPlaceholderText('Deck description');
        
        fireEvent.changeText(nameInput, 'Updated Deck Name');
        fireEvent.changeText(descriptionInput, 'Updated Description');
        
        const saveButton = screen.getByTestId('save-button');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(deckService.updateDeck).toHaveBeenCalledWith('test-deck-id', {
          name: 'Updated Deck Name',
          description: 'Updated Description',
        });
      });
    });

    it('should display success alert after successful update', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (deckService.updateDeck as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-button');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Deck updated successfully');
      });
    });

    it('should handle update error gracefully', async () => {
      const errorMessage = 'Failed to update deck';
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (deckService.updateDeck as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-button');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when Delete button is pressed', async () => {
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const deleteButton = screen.getByText('Delete Deck');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Deck',
        'Are you sure you want to delete this deck? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );
    });

    it('should call deleteDeck service when confirmed', async () => {
      const mockDeleteResponse: ApiResponse<null> = {
        status: 200,
        message: 'Deck deleted successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-01-15T10:00:00.000Z',
      };

      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (deckService.deleteDeck as jest.Mock).mockResolvedValue(mockDeleteResponse);

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const deleteButton = screen.getByText('Delete Deck');
      fireEvent.press(deleteButton);

      // Get the onPress callback from the Alert.alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: { text: string }) => action.text === 'Delete');
      
      // Execute the delete action
      await deleteAction.onPress();

      await waitFor(() => {
        expect(deckService.deleteDeck).toHaveBeenCalledWith('test-deck-id');
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Deck deleted successfully');
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it('should handle delete error gracefully', async () => {
      const errorMessage = 'Failed to delete deck';
      (deckService.getDeckById as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (deckService.deleteDeck as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const deleteButton = screen.getByText('Delete Deck');
      fireEvent.press(deleteButton);

      // Get the onPress callback from the Alert.alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: { text: string }) => action.text === 'Delete');
      
      // Execute the delete action
      await deleteAction.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle deck with null description', async () => {
      const deckWithNullDescription: Deck = {
        ...mockDeck,
        description: null,
      };

      (deckService.getDeckById as jest.Mock).mockResolvedValue({
        ...mockSuccessResponse,
        data: deckWithNullDescription,
      });

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Deck')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        const descriptionInput = screen.getByPlaceholderText('Deck description');
        expect(descriptionInput.props.value).toBe('');
      });
    });

    it('should not fetch deck if deckId is not provided', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: undefined });

      render(<DeckManagementScreen />);

      expect(deckService.getDeckById).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (deckService.getDeckById as jest.Mock).mockRejectedValue('String error');

      render(<DeckManagementScreen />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Deck')).toBeTruthy();
        expect(screen.getByText('Failed to fetch deck')).toBeTruthy();
      });
    });
  });
});
