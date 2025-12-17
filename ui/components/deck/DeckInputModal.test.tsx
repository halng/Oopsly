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
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DeckInputModal } from './DeckInputModal';
import { Deck } from '../../types/Deck';

jest.spyOn(Alert, 'alert');

describe('DeckInputModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const mockDeck: Deck = {
    id: 'deck-123',
    name: 'Japanese Vocabulary',
    description: 'Basic Japanese words for beginners',
    createdAt: '2025-12-14T10:00:00.000Z',
    updatedAt: '2025-12-14T15:30:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Create Mode', () => {
    it('renders with "Create New Deck" title when no deck is provided', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Create New Deck')).toBeTruthy();
    });

    it('renders empty input fields in create mode', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      const descriptionInput = screen.getByTestId('deck-description-input');

      expect(nameInput.props.value).toBe('');
      expect(descriptionInput.props.value).toBe('');
    });

    it('shows "Create" button text in create mode', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Create')).toBeTruthy();
    });

    it('validates name is required', async () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Validation Error', 'Deck name is required');
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with correct data when form is valid', async () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      const descriptionInput = screen.getByTestId('deck-description-input');

      fireEvent.changeText(nameInput, 'New Deck');
      fireEvent.changeText(descriptionInput, 'New description');

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Deck',
          description: 'New description',
        });
      });
    });

    it('trims whitespace from inputs', async () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      const descriptionInput = screen.getByTestId('deck-description-input');

      fireEvent.changeText(nameInput, '  Trimmed Name  ');
      fireEvent.changeText(descriptionInput, '  Trimmed Description  ');

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Trimmed Name',
          description: 'Trimmed Description',
        });
      });
    });

    it('submits with undefined description when empty', async () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');

      fireEvent.changeText(nameInput, 'New Deck');

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Deck',
          description: undefined,
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders with "Edit Deck" title when deck is provided', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          deck={mockDeck}
        />
      );

      expect(screen.getByText('Edit Deck')).toBeTruthy();
    });

    it('pre-fills input fields with deck data', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          deck={mockDeck}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      const descriptionInput = screen.getByTestId('deck-description-input');

      expect(nameInput.props.value).toBe('Japanese Vocabulary');
      expect(descriptionInput.props.value).toBe('Basic Japanese words for beginners');
    });

    it('shows "Update" button text in edit mode', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          deck={mockDeck}
        />
      );

      expect(screen.getByText('Update')).toBeTruthy();
    });

    it('handles deck with null description', () => {
      const deckWithNullDesc: Deck = {
        ...mockDeck,
        description: null,
      };

      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          deck={deckWithNullDesc}
        />
      );

      const descriptionInput = screen.getByTestId('deck-description-input');
      expect(descriptionInput.props.value).toBe('');
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when close button is pressed', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is pressed', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByTestId('modal-cancel-button');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('clears form when closed', () => {
      const { rerender } = render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      fireEvent.changeText(nameInput, 'Test Name');

      const cancelButton = screen.getByTestId('modal-cancel-button');
      fireEvent.press(cancelButton);

      // Rerender with visible true to see if form is cleared
      rerender(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInputAfter = screen.getByTestId('deck-name-input');
      expect(nameInputAfter.props.value).toBe('');
    });
  });

  describe('Loading State', () => {
    it('disables inputs when loading', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      const descriptionInput = screen.getByTestId('deck-description-input');

      expect(nameInput.props.editable).toBe(false);
      expect(descriptionInput.props.editable).toBe(false);
    });

    it('disables close button when loading', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      const closeButton = screen.getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      // onClose should not be called when loading
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('disables cancel button when loading', () => {
      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      const cancelButton = screen.getByTestId('modal-cancel-button');
      fireEvent.press(cancelButton);

      // onClose should not be called when loading
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when onSubmit throws', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Failed to create deck'));

      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      fireEvent.changeText(nameInput, 'Test Deck');

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create deck')).toBeTruthy();
      });
    });

    it('displays generic error message when error is not an Error instance', async () => {
      mockOnSubmit.mockRejectedValue('Something went wrong');

      render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('deck-name-input');
      fireEvent.changeText(nameInput, 'Test Deck');

      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeTruthy();
      });
    });

    it('clears error when modal is reopened', () => {
      const { rerender } = render(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to submit without name to show error
      const submitButton = screen.getByTestId('modal-submit-button');
      fireEvent.press(submitButton);

      // Rerender with new visible state to simulate reopening
      rerender(
        <DeckInputModal
          visible={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      rerender(
        <DeckInputModal
          visible={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Error should be cleared
      expect(screen.queryByText('Deck name is required')).toBeNull();
    });
  });
});
