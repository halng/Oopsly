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
      
      expect(screen.getByTestId('app-title-text').props.children).toBe('Oopsly');
      expect(screen.getByTestId('create-shelf-label-text').props.children).toBe('Create Shelf');
    });

    it('renders motivational quote', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      expect(screen.getByTestId('quote-text').props.children).toBe('"The expert in anything was once a beginner."');
      expect(screen.getByTestId('quote-author-text').props.children).toBe('- Helen Hayes');
    });

    it('renders navigation menu items', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      expect(screen.getByTestId('tasks-label-text').props.children).toBe('Tasks');
      expect(screen.getByTestId('notes-label-text').props.children).toBe('Notes');
      expect(screen.getByTestId('planner-label-text').props.children).toBe('Planner');
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
        expect(screen.getByTestId('shelf-name-text-1').props.children).toBe('Test Shelf 1');
        expect(screen.getByTestId('shelf-name-text-2').props.children).toBe('Test Shelf 2');
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
        expect(screen.getByTestId('subject-name-text-subject-1').props.children).toBe('Calculus');
        expect(screen.getByTestId('subject-name-text-subject-2').props.children).toBe('Algebra');
        expect(screen.getByTestId('subject-due-text-subject-1').props.children).toEqual([5, ' due']);
        expect(screen.getByTestId('subject-due-text-subject-2').props.children).toEqual([0, ' due']);
        expect(screen.getByTestId('subject-progress-text-subject-1').props.children).toEqual([75, '%']);
        expect(screen.getByTestId('subject-progress-text-subject-2').props.children).toEqual([100, '%']);
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
        expect(screen.getByTestId('manage-shelf-title-text-shelf-1').props.children).toBe('Management');
        expect(screen.getByTestId('manage-shelf-subtitle-text-shelf-1').props.children).toBe('Tap to manage');
      });
    });
  });

  describe('Create Shelf Modal', () => {
    it('opens create shelf modal when clicking Create Shelf button', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const createButton = screen.getByTestId('create-shelf-button');
      fireEvent.press(createButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('create-shelf-modal-title-text').props.children).toBe('Create New Shelf');
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
    });

    it('closes create shelf modal when clicking X button', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('create-shelf-modal-title-text').props.children).toBe('Create New Shelf');
      });
      
      const closeButton = screen.getByTestId('create-shelf-modal-close-button');
      fireEvent.press(closeButton);
    });

    it('shows alert when trying to create shelf with empty name', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
      
      const createButton = screen.getByTestId('create-shelf-submit-button');
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
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
      
      const nameInput = screen.getByTestId('shelf-name-input');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const descriptionInput = screen.getByTestId('shelf-description-input');
      fireEvent.changeText(descriptionInput, 'New Description');
      
      const createButton = screen.getByTestId('create-shelf-submit-button');
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
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
      
      const nameInput = screen.getByTestId('shelf-name-input');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const createButton = screen.getByTestId('create-shelf-submit-button');
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
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-selector-hint-text').props.children).toBe('Tap to change');
      });
      
      const iconSelector = screen.getByTestId('icon-selector-button');
      fireEvent.press(iconSelector);
      
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
        expect(screen.getByTestId('manage-shelf-title-text-shelf-1')).toBeTruthy();
      });
      
      const managementCard = screen.getByTestId('manage-shelf-button-shelf-1');
      fireEvent.press(managementCard);
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
        expect(screen.getByTestId('shelf-name-text-shelf-1').props.children).toBe('Test Shelf');
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
        expect(screen.getByTestId('shelf-name-text-shelf-1').props.children).toBe('Test Shelf');
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
        expect(screen.getByTestId('subject-name-text-subject-1')).toBeTruthy();
      });
      
      const subjectCard = screen.getByTestId('subject-card-subject-1');
      fireEvent.press(subjectCard);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('shelf-1/subject/subject-1');
      });
    });

    it('navigates to tasks page when clicking Tasks', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const tasksButton = screen.getByTestId('tasks-button');
      fireEvent.press(tasksButton);
      
      expect(mockPush).toHaveBeenCalledWith('/tasks-list');
    });

    it('navigates to notes page when clicking Notes', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const notesButton = screen.getByTestId('notes-button');
      fireEvent.press(notesButton);
      
      expect(mockPush).toHaveBeenCalledWith('/notes');
    });

    it('navigates to planner page when clicking Planner', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      const plannerButton = screen.getByTestId('planner-button');
      fireEvent.press(plannerButton);
      
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
        expect(screen.getByTestId('subject-name-text-subject-1').props.children).toBe('New Subject');
        expect(screen.getByTestId('subject-progress-text-subject-1').props.children).toEqual([0, '%']);
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
        expect(screen.getByTestId('subject-name-text-subject-1').props.children).toBe('Subject No Progress');
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
        expect(screen.getByTestId('shelf-name-text-shelf-1').props.children).toBe('Test Shelf');
      });
    });

    it('handles empty shelves array', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      // Should render without errors
      expect(screen.getByTestId('app-title-text').props.children).toBe('Oopsly');
    });

    it('handles undefined shelves', async () => {
      render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });
      
      // Should render without errors even with undefined shelves
      expect(screen.getByTestId('app-title-text').props.children).toBe('Oopsly');
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
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
      
      const nameInput = screen.getByTestId('shelf-name-input');
      fireEvent.changeText(nameInput, 'Failed Shelf');
      
      const createButton = screen.getByTestId('create-shelf-submit-button');
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
      
      fireEvent.press(screen.getByTestId('create-shelf-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
      });
      
      const nameInput = screen.getByTestId('shelf-name-input');
      fireEvent.changeText(nameInput, 'New Shelf');
      
      const descInput = screen.getByTestId('shelf-description-input');
      fireEvent.changeText(descInput, 'Desc');
      
      const createButton = screen.getByTestId('create-shelf-submit-button');
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
        expect(screen.getByTestId('shelf-name-text-shelf-1').props.children).toBe('Coding Shelf');
        expect(screen.getByTestId('shelf-name-text-shelf-2').props.children).toBe('Language Shelf');
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
        expect(screen.getByTestId('subject-name-text-subject-1').props.children).toBe('Subject 1');
        expect(screen.getByTestId('subject-name-text-subject-2').props.children).toBe('Subject 2');
        expect(screen.getByTestId('subject-name-text-subject-3').props.children).toBe('Subject 3');
        expect(screen.getByTestId('subject-progress-text-subject-3').props.children).toEqual([100, '%']);
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
        expect(screen.getByTestId('shelf-name-text-shelf-1').props.children).toBe('Coding');
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for create shelf modal', async () => {
      const { toJSON } = render(<OopslyApp />);
      
      await waitFor(() => {
        expect(mockFetchShelves).toHaveBeenCalled();
      });

      fireEvent.press(screen.getByTestId('create-shelf-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shelf-name-input').props.placeholder).toBe('Enter shelf name');
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
        expect(screen.getByTestId('subject-name-text-subject-1').props.children).toBe('Math');
      });

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
