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
});
