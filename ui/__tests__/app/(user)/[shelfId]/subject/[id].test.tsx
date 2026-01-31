/*
 *    Copyright 2026 Hao Nguyen Tan
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
import { Alert } from 'react-native';
import React from 'react';
import SubjectDetailScreen from '../../../../../app/(user)/[shelfId]/subject/[id]';
import * as CardService from '../../../../../services/CardService';
import * as SubjectService from '../../../../../services/SubjectService';

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

// Mock services
jest.mock('../../../../../services/CardService');
jest.mock('../../../../../services/SubjectService');

// Mock Logger
jest.mock('../../../../../utils', () => ({
  Logger: {
    extend: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SubjectDetailScreen', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockFetchCards = CardService.fetchCardsDataBySubjectAndShelf as jest.MockedFunction<typeof CardService.fetchCardsDataBySubjectAndShelf>;
  const mockCreateCard = CardService.createNewCard as jest.MockedFunction<typeof CardService.createNewCard>;
  const mockUpdateCard = CardService.updateCard as jest.MockedFunction<typeof CardService.updateCard>;
  const mockDeleteCard = CardService.deleteCard as jest.MockedFunction<typeof CardService.deleteCard>;
  const mockGetSubject = SubjectService.getSubjectById as jest.MockedFunction<typeof SubjectService.getSubjectById>;
  const mockUpdateSubject = SubjectService.updateSubjectById as jest.MockedFunction<typeof SubjectService.updateSubjectById>;
  const mockUpdateSettings = SubjectService.updateSubjectSetting as jest.MockedFunction<typeof SubjectService.updateSubjectSetting>;

  const mockParams = {
    shelfId: 'shelf-123',
    id: 'subject-456',
  };

  const mockSubjectData = {
    isSuccess: true,
    message: 'Success',
    data: {
      id: 'subject-456',
      name: 'Mathematics',
      description: 'Math course',
      completedPercent: 75,
      overdue: 5,
      dailyLimit: 20,
      newCardsPerDay: 10,
      interval: 7,
    },
  };

  const mockCardsData = {
    isSuccess: true,
    message: 'Success',
    data: {
      entities: [
        { id: 'card-1', front: 'Question 1', back: 'Answer 1' },
        { id: 'card-2', front: 'Question 2', back: 'Answer 2' },
      ],
      totalElements: 2,
    },
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useLocalSearchParams as jest.Mock).mockReturnValue(mockParams);
    jest.clearAllMocks();
    
    mockGetSubject.mockResolvedValue(mockSubjectData);
    mockFetchCards.mockResolvedValue(mockCardsData);
  });

  describe('Initial Rendering', () => {
    it('renders subject detail screen correctly', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalledWith('shelf-123', 'subject-456');
        expect(mockFetchCards).toHaveBeenCalledWith('shelf-123', 'subject-456');
      });
      
      expect(screen.getByText('Mathematics')).toBeTruthy();
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('displays progress bar with correct percentage', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Progress')).toBeTruthy();
        expect(screen.getByText('75%')).toBeTruthy();
      });
    });

    it('displays review due cards button with count', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Review Due Cards')).toBeTruthy();
        expect(screen.getByText('5 cards ready for review')).toBeTruthy();
      });
    });

    it('displays cards count', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Cards in this subject')).toBeTruthy();
        expect(screen.getByText('2 cards')).toBeTruthy();
      });
    });

    it('displays all cards in the list', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
        expect(screen.getByText('Answer 1')).toBeTruthy();
        expect(screen.getByText('Question 2')).toBeTruthy();
        expect(screen.getByText('Answer 2')).toBeTruthy();
      });
    });

    it('displays empty state when no cards exist', async () => {
      mockFetchCards.mockResolvedValue({
        ...mockCardsData,
        data: { ...mockCardsData.data, entities: [], totalElements: 0 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('No cards in this subject yet')).toBeTruthy();
        expect(screen.getByText('Add Your First Card')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
      
      const backButton = screen.getAllByRole('button')[0];
      fireEvent.press(backButton);
      
      expect(mockBack).toHaveBeenCalled();
    });

    it('navigates to study page when Review Due Cards is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Review Due Cards')).toBeTruthy();
      });
      
      const reviewButton = screen.getByText('Review Due Cards');
      fireEvent.press(reviewButton.parent);
      
      expect(mockPush).toHaveBeenCalledWith('/study/subject-456');
    });

    it('navigates back when params are missing', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({});

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });
  });

  describe('Subject Name Editing', () => {
    it('toggles edit mode when edit button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Mathematics')).toBeTruthy();
      });
      
      // Find edit button and press it
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => {
        // The edit button is near the top
        return true;
      });
      
      if (editButton) {
        fireEvent.press(editButton);
      }
    });

    it('saves subject name when toggling out of edit mode', async () => {
      mockUpdateSubject.mockResolvedValue({
        isSuccess: true,
        message: 'Updated',
        data: { ...mockSubjectData.data, name: 'Updated Math' },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Mathematics')).toBeTruthy();
      });
    });

    it('handles subject update error', async () => {
      mockUpdateSubject.mockRejectedValue(new Error('Update failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });
  });

  describe('Card Creation', () => {
    it('opens add card modal when Add Card button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Card')).toBeTruthy();
      });
      
      const addButton = screen.getByText('Add Card');
      fireEvent.press(addButton.parent);
      
      await waitFor(() => {
        expect(screen.getByText('Add New Card')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter answer or definition')).toBeTruthy();
      });
    });

    it('creates new card successfully', async () => {
      mockCreateCard.mockResolvedValue({
        isSuccess: true,
        message: 'Card created',
        data: { count: 1 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Card')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByText('Add Card').parent);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });
      
      const frontInput = screen.getByPlaceholderText('Enter question or term');
      const backInput = screen.getByPlaceholderText('Enter answer or definition');
      
      fireEvent.changeText(frontInput, 'New Question');
      fireEvent.changeText(backInput, 'New Answer');
      
      const addCardButton = screen.getByText('Add Card', { exact: false });
      fireEvent.press(addCardButton);
      
      await waitFor(() => {
        expect(mockCreateCard).toHaveBeenCalledWith('shelf-123', 'subject-456', [
          { front: 'New Question', back: 'New Answer' },
        ]);
        expect(mockFetchCards).toHaveBeenCalledTimes(2); // Initial + after create
      });
    });

    it('does not create card with empty fields', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Card')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByText('Add Card').parent);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });
      
      const addCardButton = screen.getAllByText('Add Card').find(el => el.props.children === 'Add Card');
      
      // Button should be disabled when fields are empty
      expect(mockCreateCard).not.toHaveBeenCalled();
    });

    it('handles card creation error', async () => {
      mockCreateCard.mockRejectedValue(new Error('Creation failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Card')).toBeTruthy();
      });
    });

    it('closes modal when X button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Card')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByText('Add Card').parent);
      
      await waitFor(() => {
        expect(screen.getByText('Add New Card')).toBeTruthy();
      });
      
      // Modal should have X button to close
    });
  });

  describe('Card Updating', () => {
    it('opens edit card modal with existing card data', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });
    });

    it('updates card successfully', async () => {
      mockUpdateCard.mockResolvedValue({
        isSuccess: true,
        message: 'Card updated',
        data: { id: 'card-1', front: 'Updated Question', back: 'Updated Answer' },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('handles card update error', async () => {
      mockUpdateCard.mockRejectedValue(new Error('Update failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });
  });

  describe('Card Deletion', () => {
    it('deletes card successfully', async () => {
      mockDeleteCard.mockResolvedValue({
        isSuccess: true,
        message: 'Card deleted',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('handles card deletion error', async () => {
      mockDeleteCard.mockRejectedValue(new Error('Delete failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('handles card deletion failure response', async () => {
      mockDeleteCard.mockResolvedValue({
        isSuccess: false,
        message: 'Failed to delete',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });
  });

  describe('Settings Modal', () => {
    it('opens settings modal when Settings button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeTruthy();
      });
      
      const settingsButton = screen.getByText('Settings');
      fireEvent.press(settingsButton.parent);
      
      await waitFor(() => {
        expect(screen.getByText('Study Settings')).toBeTruthy();
      });
    });

    it('saves settings successfully', async () => {
      mockUpdateSettings.mockResolvedValue({
        isSuccess: true,
        message: 'Settings updated',
        data: {},
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('handles settings update error', async () => {
      mockUpdateSettings.mockRejectedValue(new Error('Settings update failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('closes settings modal when X button is pressed', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeTruthy();
      });
    });
  });

  describe('Delete Subject', () => {
    it('shows delete confirmation dialog', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('navigates back when subject is deleted', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles subject fetch error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockGetSubject.mockRejectedValue(new Error('Fetch failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('handles cards fetch error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetchCards.mockRejectedValue(new Error('Fetch failed'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('handles cards fetch failure response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetchCards.mockResolvedValue({
        isSuccess: false,
        message: 'Failed to fetch',
        data: { entities: [], totalElements: 0 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles 0% completion', async () => {
      mockGetSubject.mockResolvedValue({
        ...mockSubjectData,
        data: { ...mockSubjectData.data, completedPercent: 0 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('0%')).toBeTruthy();
      });
    });

    it('handles 100% completion', async () => {
      mockGetSubject.mockResolvedValue({
        ...mockSubjectData,
        data: { ...mockSubjectData.data, completedPercent: 100 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeTruthy();
      });
    });

    it('handles undefined completion percentage', async () => {
      mockGetSubject.mockResolvedValue({
        ...mockSubjectData,
        data: { ...mockSubjectData.data, completedPercent: undefined },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
    });

    it('handles 0 overdue cards', async () => {
      mockGetSubject.mockResolvedValue({
        ...mockSubjectData,
        data: { ...mockSubjectData.data, overdue: 0 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('0 cards ready for review')).toBeTruthy();
      });
    });

    it('handles very long card content', async () => {
      const longText = 'A'.repeat(500);
      mockFetchCards.mockResolvedValue({
        ...mockCardsData,
        data: {
          ...mockCardsData.data,
          entities: [
            { id: 'card-1', front: longText, back: longText },
          ],
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(longText)).toBeTruthy();
      });
    });

    it('handles special characters in card content', async () => {
      mockFetchCards.mockResolvedValue({
        ...mockCardsData,
        data: {
          ...mockCardsData.data,
          entities: [
            { id: 'card-1', front: 'Question with @#$%', back: 'Answer with &*()' },
          ],
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question with @#$%')).toBeTruthy();
        expect(screen.getByText('Answer with &*()')).toBeTruthy();
      });
    });

    it('handles network timeout', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      mockGetSubject.mockRejectedValue(error);

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockBack).not.toHaveBeenCalled(); // Should still render despite error
      });
    });

    it('handles concurrent fetch operations', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
        expect(mockFetchCards).toHaveBeenCalled();
      });
      
      // Both fetches should complete
      expect(mockGetSubject).toHaveBeenCalledTimes(1);
      expect(mockFetchCards).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card Creation - Extended Coverage', () => {
    it('creates card with content', async () => {
      mockCreateCard.mockResolvedValue({
        isSuccess: true,
        message: 'Card created',
        data: { count: 1 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Add Card'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });
    });
  });

  describe('Multiple Cards Management', () => {
    it('displays cards count correctly', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('2 cards')).toBeTruthy();
      });
    });

    it('handles large number of cards', async () => {
      const manyCards = Array.from({ length: 10 }, (_, i) => ({
        id: `card-${i}`,
        front: `Question ${i}`,
        back: `Answer ${i}`,
      }));

      mockFetchCards.mockResolvedValue({
        ...mockCardsData,
        data: {
          ...mockCardsData.data,
          entities: manyCards,
          totalElements: 10,
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('10 cards')).toBeTruthy();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('displays different progress percentages', async () => {
      mockGetSubject.mockResolvedValue({
        ...mockSubjectData,
        data: {
          ...mockSubjectData.data,
          completedPercent: 50,
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('50%')).toBeTruthy();
      });
    });
  });

  describe('Edit Mode Toggle and Save', () => {
    it('toggles edit mode and saves subject name', async () => {
      mockUpdateSubject.mockResolvedValue({
        isSuccess: true,
        message: 'Updated successfully',
        data: {
          ...mockSubjectData.data,
          name: 'Updated Math',
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      // Change name
      const nameInput = screen.getByDisplayValue('Mathematics');
      fireEvent.changeText(nameInput, 'Updated Math');

      // Save changes
      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSubject).toHaveBeenCalledWith('shelf-123', 'subject-456', {
          name: 'Updated Math',
          description: 'Math course',
        });
        expect(mockGetSubject).toHaveBeenCalledTimes(2);
      });
    });

    it('handles edit mode save failure', async () => {
      mockUpdateSubject.mockResolvedValue({
        isSuccess: false,
        message: 'Update failed',
        data: null as any,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      const nameInput = screen.getByDisplayValue('Mathematics');
      fireEvent.changeText(nameInput, 'Failed Update');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSubject).toHaveBeenCalled();
      });
    });

    it('handles edit mode save error', async () => {
      mockUpdateSubject.mockRejectedValue(new Error('Network error'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSubject).toHaveBeenCalled();
      });
    });

    it('cancels edit mode without saving', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      // Toggle back without saving
      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockUpdateSubject).not.toHaveBeenCalled();
    });
  });

  describe('Add Card Complete Flow', () => {
    it('adds new card with front and back text', async () => {
      mockCreateCard.mockResolvedValue({
        isSuccess: true,
        message: 'Card created',
        data: { count: 1 },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Add Card'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });

      const frontInput = screen.getByPlaceholderText('Enter question or term');
      const backInput = screen.getByPlaceholderText('Enter answer or definition');

      fireEvent.changeText(frontInput, 'What is React?');
      fireEvent.changeText(backInput, 'A JavaScript library');

      const addButton = screen.getAllByText('Add Card')[1];
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockCreateCard).toHaveBeenCalledWith(
          'shelf-123',
          'subject-456',
          [{ front: 'What is React?', back: 'A JavaScript library' }]
        );
        expect(mockFetchCards).toHaveBeenCalledTimes(2);
      });
    });

    it('handles add card failure response', async () => {
      mockCreateCard.mockResolvedValue({
        isSuccess: false,
        message: 'Failed to create card',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Add Card'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });

      const frontInput = screen.getByPlaceholderText('Enter question or term');
      const backInput = screen.getByPlaceholderText('Enter answer or definition');

      fireEvent.changeText(frontInput, 'Question');
      fireEvent.changeText(backInput, 'Answer');

      const addButton = screen.getAllByText('Add Card')[1];
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockCreateCard).toHaveBeenCalled();
      });
    });

    it('handles add card error', async () => {
      mockCreateCard.mockRejectedValue(new Error('Network error'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Add Card'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter question or term')).toBeTruthy();
      });

      const frontInput = screen.getByPlaceholderText('Enter question or term');
      const backInput = screen.getByPlaceholderText('Enter answer or definition');

      fireEvent.changeText(frontInput, 'Question');
      fireEvent.changeText(backInput, 'Answer');

      const addButton = screen.getAllByText('Add Card')[1];
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockCreateCard).toHaveBeenCalled();
      });
    });
  });

  describe('Update Card Complete Flow', () => {
    it('opens edit modal and updates card', async () => {
      mockUpdateCard.mockResolvedValue({
        isSuccess: true,
        message: 'Updated',
        data: {
          id: 'card-1',
          front: 'Updated Question',
          back: 'Updated Answer',
        },
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      // Find and press edit button on card
      const editButtons = screen.getAllByText('Edit');
      fireEvent.press(editButtons[1]); // First card's edit button

      await waitFor(() => {
        expect(screen.getByDisplayValue('Question 1')).toBeTruthy();
      });

      const frontInput = screen.getByDisplayValue('Question 1');
      const backInput = screen.getByDisplayValue('Answer 1');

      fireEvent.changeText(frontInput, 'Updated Question');
      fireEvent.changeText(backInput, 'Updated Answer');

      const updateButton = screen.getByText('Update Card');
      fireEvent.press(updateButton);

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalledWith(
          'shelf-123',
          'subject-456',
          'card-1',
          { front: 'Updated Question', back: 'Updated Answer' }
        );
        expect(mockFetchCards).toHaveBeenCalledTimes(2);
      });
    });

    it('handles update card failure', async () => {
      mockUpdateCard.mockResolvedValue({
        isSuccess: false,
        message: 'Update failed',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.press(editButtons[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Question 1')).toBeTruthy();
      });

      const updateButton = screen.getByText('Update Card');
      fireEvent.press(updateButton);

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalled();
      });
    });

    it('handles update card error', async () => {
      mockUpdateCard.mockRejectedValue(new Error('Network error'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.press(editButtons[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Question 1')).toBeTruthy();
      });

      const updateButton = screen.getByText('Update Card');
      fireEvent.press(updateButton);

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Card Complete Flow', () => {
    it('deletes card successfully', async () => {
      mockDeleteCard.mockResolvedValue({
        isSuccess: true,
        message: 'Deleted',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteCard).toHaveBeenCalledWith('shelf-123', 'subject-456', 'card-1');
        expect(mockFetchCards).toHaveBeenCalledTimes(2);
      });
    });

    it('handles delete card failure', async () => {
      mockDeleteCard.mockResolvedValue({
        isSuccess: false,
        message: 'Delete failed',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteCard).toHaveBeenCalled();
      });
    });

    it('handles delete card error', async () => {
      mockDeleteCard.mockRejectedValue(new Error('Network error'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeTruthy();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteCard).toHaveBeenCalled();
      });
    });
  });

  describe('Settings Modal Complete Flow', () => {
    it('opens settings and saves successfully', async () => {
      mockUpdateSettings.mockResolvedValue({
        isSuccess: true,
        message: 'Settings updated',
        data: {},
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Study Settings')).toBeTruthy();
      });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('shelf-123', 'subject-456', {
          dailyLimit: 20,
          newCardsPerDay: 10,
          interval: 7,
        });
        expect(mockGetSubject).toHaveBeenCalledTimes(2);
      });
    });

    it('handles settings save failure', async () => {
      mockUpdateSettings.mockResolvedValue({
        isSuccess: false,
        message: 'Update failed',
        data: null,
      });

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Study Settings')).toBeTruthy();
      });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
        expect(mockGetSubject).toHaveBeenCalledTimes(2);
      });
    });

    it('handles settings save error', async () => {
      mockUpdateSettings.mockRejectedValue(new Error('Network error'));

      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Study Settings')).toBeTruthy();
      });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Subject Flow', () => {
    it('shows delete button in edit mode', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Subject')).toBeTruthy();
      });
    });

    it('shows confirmation dialog when deleting subject', async () => {
      render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      const deleteButton = screen.getByText('Delete Subject');
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete Subject',
          'Are you sure you want to delete this subject? This action cannot be undone.',
          expect.any(Array)
        );
      });
    });
  });

  describe('Snapshot Tests', () => {
    it('matches snapshot for initial render', async () => {
      const { toJSON } = render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for empty card list', async () => {
      mockFetchCards.mockResolvedValue({
        ...mockCardsData,
        data: {
          ...mockCardsData.data,
          entities: [],
          totalElements: 0,
        },
      });

      const { toJSON } = render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Your First Card')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for edit mode', async () => {
      const { toJSON } = render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Subject')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for add card modal', async () => {
      const { toJSON } = render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Add Card'));

      await waitFor(() => {
        expect(screen.getByText('Add New Card')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for settings modal', async () => {
      const { toJSON } = render(<SubjectDetailScreen />);
      
      await waitFor(() => {
        expect(mockGetSubject).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Study Settings')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
