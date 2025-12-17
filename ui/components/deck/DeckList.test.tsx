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

import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { DeckList } from './DeckList';
import { deckService } from '../../services/deckService';
import { Deck, DeckPaginatedResponse } from '../../types/Deck';
import { ApiResponse } from '../../types/api';

jest.mock('../../services/deckService', () => ({
  deckService: {
    fetchDecks: jest.fn(),
    createDeck: jest.fn(),
    updateDeck: jest.fn(),
    deleteDeck: jest.fn(),
  },
}));

jest.spyOn(Alert, 'alert');

describe('DeckList', () => {
  const mockDecks: Deck[] = [
    {
      id: 'deck-1',
      name: 'Japanese Vocabulary',
      description: 'Basic Japanese words for beginners',
      createdAt: '2025-12-14T10:00:00.000Z',
      updatedAt: '2025-12-14T15:30:00.000Z',
    },
    {
      id: 'deck-2',
      name: 'Math Formulas',
      description: 'Essential math formulas',
      createdAt: '2025-12-13T10:00:00.000Z',
      updatedAt: '2025-12-13T10:00:00.000Z',
    },
  ];

  const mockPaginatedResponse: ApiResponse<DeckPaginatedResponse> = {
    status: 200,
    message: 'Decks retrieved successfully',
    data: {
      content: mockDecks,
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    },
    isSuccess: true,
    timestamp: '2025-12-14T23:00:00.000Z',
  };

  const mockEmptyResponse: ApiResponse<DeckPaginatedResponse> = {
    status: 200,
    message: 'Decks retrieved successfully',
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
    (deckService.fetchDecks as jest.Mock).mockResolvedValue(mockPaginatedResponse);
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching decks', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: ApiResponse<DeckPaginatedResponse>) => void;
      const pendingPromise = new Promise<ApiResponse<DeckPaginatedResponse>>((resolve) => {
        resolvePromise = resolve;
      });
      (deckService.fetchDecks as jest.Mock).mockReturnValue(pendingPromise);

      render(<DeckList />);

      expect(screen.getByText('Loading decks...')).toBeTruthy();

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockPaginatedResponse);
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no decks exist', async () => {
      (deckService.fetchDecks as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByText('No decks yet')).toBeTruthy();
        expect(screen.getByText('Create your first deck to start organizing your flashcards')).toBeTruthy();
        expect(screen.getByTestId('create-first-deck-button')).toBeTruthy();
      });
    });

    it('opens create modal when "Create Your First Deck" is pressed', async () => {
      (deckService.fetchDecks as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('create-first-deck-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('create-first-deck-button'));

      await waitFor(() => {
        expect(screen.getByText('Create New Deck')).toBeTruthy();
      });
    });
  });

  describe('Error State', () => {
    it('shows error state when fetch fails', async () => {
      (deckService.fetchDecks as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('retries fetch when retry button is pressed', async () => {
      (deckService.fetchDecks as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPaginatedResponse);

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(deckService.fetchDecks).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });
    });

    it('shows generic error message when error is not an Error instance', async () => {
      (deckService.fetchDecks as jest.Mock).mockRejectedValue('Something went wrong');

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch decks')).toBeTruthy();
      });
    });
  });

  describe('Deck List Display', () => {
    it('renders list of decks correctly', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
        expect(screen.getByText('Math Formulas')).toBeTruthy();
      });
    });

    it('shows FAB when decks exist', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-deck')).toBeTruthy();
      });
    });

    it('does not show FAB when no decks exist', async () => {
      (deckService.fetchDecks as jest.Mock).mockResolvedValue(mockEmptyResponse);

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.queryByTestId('fab-create-deck')).toBeNull();
      });
    });

    it('calls onDeckPress when deck card is pressed', async () => {
      const mockOnDeckPress = jest.fn();
      render(<DeckList onDeckPress={mockOnDeckPress} />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-deck-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-card-deck-1'));

      expect(mockOnDeckPress).toHaveBeenCalledWith(mockDecks[0]);
    });
  });

  describe('Create Deck', () => {
    it('opens create modal when FAB is pressed', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-deck')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('fab-create-deck'));

      await waitFor(() => {
        expect(screen.getByText('Create New Deck')).toBeTruthy();
      });
    });

    it('creates deck and refreshes list on successful creation', async () => {
      const newDeck: Deck = {
        id: 'deck-new',
        name: 'New Deck',
        description: 'New description',
        createdAt: '2025-12-15T10:00:00.000Z',
        updatedAt: '2025-12-15T10:00:00.000Z',
      };

      (deckService.createDeck as jest.Mock).mockResolvedValue({
        status: 201,
        message: 'Deck created successfully',
        data: newDeck,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-deck')).toBeTruthy();
      });

      // Open modal
      await act(async () => {
        fireEvent.press(screen.getByTestId('fab-create-deck'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('deck-name-input')).toBeTruthy();
      });

      // Fill form
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('deck-name-input'), 'New Deck');
        fireEvent.changeText(screen.getByTestId('deck-description-input'), 'New description');
      });

      // Submit
      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-submit-button'));
      });

      await waitFor(() => {
        expect(deckService.createDeck).toHaveBeenCalledWith({
          name: 'New Deck',
          description: 'New description',
        });
      });

      // fetchDecks should be called again after creation (initial + after create)
      await waitFor(() => {
        expect(deckService.fetchDecks).toHaveBeenCalledTimes(2);
      });
    });

    it('closes modal when cancel is pressed', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('fab-create-deck')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('fab-create-deck'));

      await waitFor(() => {
        expect(screen.getByText('Create New Deck')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('modal-cancel-button'));

      await waitFor(() => {
        expect(screen.queryByText('Create New Deck')).toBeNull();
      });
    });
  });

  describe('Edit Deck', () => {
    it('opens edit modal with pre-filled data when edit button is pressed', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-edit-deck-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-edit-deck-1'));

      await waitFor(() => {
        expect(screen.getByText('Edit Deck')).toBeTruthy();
        const nameInput = screen.getByTestId('deck-name-input');
        expect(nameInput.props.value).toBe('Japanese Vocabulary');
      });
    });

    it('updates deck and refreshes list on successful update', async () => {
      const updatedDeck: Deck = {
        ...mockDecks[0],
        name: 'Updated Name',
        description: 'Updated description',
      };

      (deckService.updateDeck as jest.Mock).mockResolvedValue({
        status: 200,
        message: 'Deck updated successfully',
        data: updatedDeck,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-edit-deck-1')).toBeTruthy();
      });

      // Open edit modal
      fireEvent.press(screen.getByTestId('deck-edit-deck-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deck-name-input')).toBeTruthy();
      });

      // Update form
      fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Updated Name');

      // Submit
      fireEvent.press(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(deckService.updateDeck).toHaveBeenCalledWith('deck-1', {
          name: 'Updated Name',
          description: 'Basic Japanese words for beginners',
        });
      });
    });
  });

  describe('Delete Deck', () => {
    it('shows confirmation dialog when delete button is pressed', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-delete-deck-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-delete-deck-1'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Deck',
        'Are you sure you want to delete "Japanese Vocabulary"? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('deletes deck with optimistic update when confirmed', async () => {
      (deckService.deleteDeck as jest.Mock).mockResolvedValue({
        status: 200,
        message: 'Deck deleted successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-15T10:00:00.000Z',
      });

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-delete-deck-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-delete-deck-1'));

      // Simulate pressing "Delete" in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      
      await act(async () => {
        await deleteButton.onPress();
      });

      expect(deckService.deleteDeck).toHaveBeenCalledWith('deck-1');
      
      // Deck should be removed from UI (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('Japanese Vocabulary')).toBeNull();
      });
    });

    it('reverts optimistic update on delete failure', async () => {
      (deckService.deleteDeck as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-delete-deck-1'));

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

      // Deck should be restored in UI
      await waitFor(() => {
        expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      });
    });

    it('does nothing when cancel is pressed in delete confirmation', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-delete-deck-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('deck-delete-deck-1'));

      // Verify deck is still there
      expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
      expect(deckService.deleteDeck).not.toHaveBeenCalled();
    });
  });

  describe('Pull to Refresh', () => {
    it('refreshes deck list when pull-to-refresh is triggered', async () => {
      render(<DeckList />);

      await waitFor(() => {
        expect(screen.getByTestId('deck-list')).toBeTruthy();
      });

      // Simulate pull-to-refresh
      const flatList = screen.getByTestId('deck-list');
      const refreshControl = flatList.props.refreshControl;
      
      await act(async () => {
        refreshControl.props.onRefresh();
      });

      // fetchDecks should be called twice (initial + refresh)
      expect(deckService.fetchDecks).toHaveBeenCalledTimes(2);
    });
  });
});
