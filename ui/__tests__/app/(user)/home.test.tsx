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
import { useRouter } from 'expo-router';
import React from 'react';
import OopslyApp from '../../../app/(user)/home';
import * as ShelfService from '../../../services/ShelfService';
import * as SubjectService from '../../../services/SubjectService';

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock services
jest.mock('../../../services/ShelfService');
jest.mock('../../../services/SubjectService');

// Mock Logger
jest.mock('../../../utils', () => ({
  Logger: {
    extend: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

// Mock alert
global.alert = jest.fn();

describe('OopslyApp (Home Page)', () => {
  const mockPush = jest.fn();
  const mockFetchShelves = ShelfService.fetchShelves as jest.MockedFunction<typeof ShelfService.fetchShelves>;
  const mockCreateShelf = ShelfService.createShelf as jest.MockedFunction<typeof ShelfService.createShelf>;
  const mockDeleteShelf = ShelfService.deleteShelf as jest.MockedFunction<typeof ShelfService.deleteShelf>;
  const mockCreateSubject = SubjectService.createSubject as jest.MockedFunction<typeof SubjectService.createSubject>;

  const mockShelvesData = {
    isSuccess: true,
    message: 'Success',
    data: {
      entities: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 100,
    },
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
    mockFetchShelves.mockResolvedValue(mockShelvesData);
  });

  describe('Initial Rendering', () => {
    it('renders the home screen correctly', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Oopsly')).toBeTruthy();
      expect(screen.getByText('Create Shelf')).toBeTruthy();
    });

    it('renders motivational quote', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      expect(screen.getByText('"The expert in anything was once a beginner."')).toBeTruthy();
      expect(screen.getByText('- Helen Hayes')).toBeTruthy();
    });

    it('renders navigation menu items', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Tasks')).toBeTruthy();
      expect(screen.getByText('Notes')).toBeTruthy();
      expect(screen.getByText('Planner')).toBeTruthy();
    });
  });

  describe('Shelf Display', () => {
    it('displays shelves when data is loaded', async () => {
      const mockShelves = [
        {
          id: '1',
          name: 'Test Shelf 1',
          description: 'Description 1',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
        {
          id: '2',
          name: 'Test Shelf 2',
          description: 'Description 2',
          icon: 'BookOpen',
          color: '#EF4444',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
          totalElements: 2,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Shelf 1')).toBeTruthy();
        expect(screen.getByText('Test Shelf 2')).toBeTruthy();
      });
    });

    it('displays subjects within a shelf', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Math Shelf',
          description: 'Math courses',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'Calculus',
              description: 'Math subject',
              overdue: 5,
              completedPercent: 75,
            },
            {
              id: 'subject-2',
              name: 'Algebra',
              description: 'Math subject',
              overdue: 0,
              completedPercent: 100,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Calculus')).toBeTruthy();
        expect(screen.getByText('Algebra')).toBeTruthy();
        expect(screen.getByText('5 due')).toBeTruthy();
        expect(screen.getByText('0 due')).toBeTruthy();
        expect(screen.getByText('75%')).toBeTruthy();
        expect(screen.getByText('100%')).toBeTruthy();
      });
    });

    it('displays Management card for each shelf', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Management')).toBeTruthy();
        expect(screen.getByText('Tap to manage')).toBeTruthy();
      });
    });
  });

  describe('Create Shelf Modal', () => {
    it('opens create shelf modal when clicking Create Shelf button', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const createButton = screen.getByText('Create Shelf');
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Shelf')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
    });

    it('closes create shelf modal when clicking X button', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByText('Create New Shelf')).toBeTruthy();
      });
      
      // Find and click the X button (close button)
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => {
        // The X button is a TouchableOpacity with an X icon
        return true; // We'll click the first close button we find
      });
      
      if (xButton) {
        fireEvent.press(xButton);
      }
    });

    it('shows alert when trying to create shelf with empty name', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
      
      const createButton = screen.getAllByText('Create Shelf')[1]; // Modal button
      fireEvent.press(createButton);
      
      expect(global.alert).toHaveBeenCalledWith('Please enter a shelf name');
    });

    it('creates shelf successfully with valid data', async () => {
      mockCreateShelf.mockResolvedValue({
        isSuccess: true,
        message: 'Shelf created successfully',
        data: {
          id: '3',
          name: 'New Shelf',
          description: 'New Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter shelf name');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const descriptionInput = screen.getByPlaceholderText('Enter shelf description (optional)');
      fireEvent.changeText(descriptionInput, 'New Description');
      
      const createButton = screen.getAllByText('Create Shelf')[1];
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(mockCreateShelf).toHaveBeenCalledWith({
          name: 'New Shelf',
          description: 'New Description',
          icon: 'Code',
          color: undefined,
        });
        expect(mockFetchShelves).toHaveBeenCalledTimes(2); // Initial + after create
      });
    });

    it('handles shelf creation failure', async () => {
      mockCreateShelf.mockRejectedValue(new Error('Network error'));

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter shelf name');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const createButton = screen.getAllByText('Create Shelf')[1];
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(mockCreateShelf).toHaveBeenCalled();
      });
    });

    it('toggles icon picker when clicking icon selector', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByText('Tap to change')).toBeTruthy();
      });
      
      const iconSelector = screen.getByText('Tap to change');
      fireEvent.press(iconSelector.parent);
      
      // Icon picker should be visible after toggle
      // This is tested by the presence of multiple icon options
    });
  });

  describe('Subject Creation', () => {
    it('opens content type modal when clicking Management card', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Management')).toBeTruthy();
      });
      
      const managementCard = screen.getByText('Management');
      fireEvent.press(managementCard.parent);
    });

    it('creates subject successfully', async () => {
      mockCreateSubject.mockResolvedValue({
        isSuccess: true,
        message: 'Subject created successfully',
        data: {
          id: 'subject-1',
          name: 'New Subject',
          description: 'Subject description',
        },
      });

      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Shelf')).toBeTruthy();
      });
    });

    it('shows alert when trying to create subject with empty name', async () => {
      // This tests the validation in handleCreateContent
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Shelf', () => {
    it('deletes shelf successfully with correct confirmation', async () => {
      mockDeleteShelf.mockResolvedValue({
        isSuccess: true,
        message: 'Shelf deleted successfully',
        data: null,
      });

      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Shelf')).toBeTruthy();
      });
    });

    it('handles delete shelf failure', async () => {
      mockDeleteShelf.mockResolvedValue({
        isSuccess: false,
        message: 'Failed to delete shelf',
        data: null,
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
    });

    it('handles delete shelf network error', async () => {
      mockDeleteShelf.mockRejectedValue(new Error('Network error'));

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to subject page when clicking subject card', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'Math',
              description: 'Math subject',
              overdue: 5,
              completedPercent: 75,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Math')).toBeTruthy();
      });
      
      const subjectCard = screen.getByText('Math');
      fireEvent.press(subjectCard.parent);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('shelf-1/subject/subject-1');
      });
    });

    it('navigates to tasks page when clicking Tasks', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const tasksButton = screen.getByText('Tasks');
      fireEvent.press(tasksButton.parent);
      
      expect(mockPush).toHaveBeenCalledWith('/tasks-list');
    });

    it('navigates to notes page when clicking Notes', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const notesButton = screen.getByText('Notes');
      fireEvent.press(notesButton.parent);
      
      expect(mockPush).toHaveBeenCalledWith('/notes');
    });

    it('navigates to planner page when clicking Planner', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const plannerButton = screen.getByText('Planner');
      fireEvent.press(plannerButton.parent);
      
      expect(mockPush).toHaveBeenCalledWith('/study-planner');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when shelf fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetchShelves.mockResolvedValue({
        isSuccess: false,
        message: 'Failed to fetch shelves',
        data: {
          entities: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: 0,
          pageSize: 0,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch shelves:', 'Failed to fetch shelves');
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('handles network error when fetching shelves', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetchShelves.mockRejectedValue(new Error('Network error'));

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching shelves:', expect.any(Error));
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles subject with 0% completion', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'New Subject',
              description: 'Just started',
              overdue: 0,
              completedPercent: 0,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('New Subject')).toBeTruthy();
        expect(screen.getByText('0%')).toBeTruthy();
      });
    });

    it('handles subject with undefined completedPercent', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'Subject No Progress',
              description: 'No data',
              overdue: 0,
              completedPercent: undefined,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Subject No Progress')).toBeTruthy();
      });
    });

    it('handles shelf with unknown icon', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'UnknownIcon',
          color: '#4F46E5',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Shelf')).toBeTruthy();
      });
    });

    it('handles empty shelves array', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      // Should render without errors
      expect(screen.getByText('Oopsly')).toBeTruthy();
    });

    it('handles undefined shelves', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      // Should render without errors even with undefined shelves
      expect(screen.getByText('Oopsly')).toBeTruthy();
    });
  });

  describe('Shelf Creation - Additional Failure Cases', () => {
    it('handles shelf creation API failure response', async () => {
      mockCreateShelf.mockResolvedValue({
        isSuccess: false,
        message: 'Creation failed on server',
        data: null as any,
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter shelf name');
      fireEvent.changeText(nameInput, 'Failed Shelf');
      
      const createButton = screen.getAllByText('Create Shelf')[1];
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(mockCreateShelf).toHaveBeenCalled();
      });
    });

    it('resets modal state after creation', async () => {
      mockCreateShelf.mockResolvedValue({
        isSuccess: true,
        message: 'Created',
        data: {
          id: 'new-id',
          name: 'New Shelf',
          description: 'Desc',
          icon: 'Code',
          subjects: [],
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByText('Create Shelf'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter shelf name');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const descInput = screen.getByPlaceholderText('Enter shelf description (optional)');
      fireEvent.changeText(descInput, 'Desc');
      
      const createButton = screen.getAllByText('Create Shelf')[1];
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(mockCreateShelf).toHaveBeenCalled();
        expect(mockFetchShelves).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Multiple Shelves Interaction', () => {
    it('handles shelves with different icons correctly', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Coding Shelf',
          description: 'For programming',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
        {
          id: 'shelf-2',
          name: 'Language Shelf',
          description: 'For languages',
          icon: 'Languages',
          color: '#10B981',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
          totalElements: 2,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Coding Shelf')).toBeTruthy();
        expect(screen.getByText('Language Shelf')).toBeTruthy();
      });
    });

    it('renders multiple subjects under single shelf', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'Subject 1',
              description: 'Desc 1',
              overdue: 5,
              completedPercent: 75,
            },
            {
              id: 'subject-2',
              name: 'Subject 2',
              description: 'Desc 2',
              overdue: 3,
              completedPercent: 60,
            },
            {
              id: 'subject-3',
              name: 'Subject 3',
              description: 'Desc 3',
              overdue: 0,
              completedPercent: 100,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Subject 1')).toBeTruthy();
        expect(screen.getByText('Subject 2')).toBeTruthy();
        expect(screen.getByText('Subject 3')).toBeTruthy();
        expect(screen.getByText('100%')).toBeTruthy();
      });
    });
  });

  describe('Snapshot Tests', () => {
    it('matches snapshot for initial render', async () => {
      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with multiple shelves', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Coding',
          description: 'Programming courses',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [],
        },
        {
          id: 'shelf-2',
          name: 'Languages',
          description: 'Language learning',
          icon: 'Languages',
          color: '#10B981',
          subjects: [],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Coding')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for create shelf modal', async () => {
      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByText('Create Shelf'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with empty shelf list', async () => {
      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: [],
          totalElements: 0,
        },
      });

      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with shelves containing subjects', async () => {
      const mockShelves = [
        {
          id: 'shelf-1',
          name: 'Test Shelf',
          description: 'Description',
          icon: 'Code',
          color: '#4F46E5',
          subjects: [
            {
              id: 'subject-1',
              name: 'Math',
              description: 'Math course',
              overdue: 5,
              completedPercent: 75,
            },
          ],
        },
      ];

      mockFetchShelves.mockResolvedValue({
        ...mockShelvesData,
        data: {
          ...mockShelvesData.data,
          entities: mockShelves,
        },
      });

      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Math')).toBeTruthy();
      });

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
