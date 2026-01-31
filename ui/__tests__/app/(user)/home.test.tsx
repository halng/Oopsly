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

describe('OopslyApp (Home Page)', () => {
  const mockPush = jest.fn();
  const mockFetchShelves = ShelfService.fetchShelves as jest.MockedFunction<typeof ShelfService.fetchShelves>;
  const mockCreateShelf = ShelfService.createShelf as jest.MockedFunction<typeof ShelfService.createShelf>;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
    
    // Default mock for fetchShelves - return empty array
    mockFetchShelves.mockResolvedValue({
      isSuccess: true,
      message: 'Success',
      data: {
        entities: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 100,
      },
    });
  });

  it('renders the home screen correctly', async () => {
    render(<OopslyApp />);
    
    // Wait for component to settle after data fetch
    await waitFor(() => {
      expect(mockFetchShelves).toHaveBeenCalled();
    });
    
    // Check that main UI elements are present
    expect(screen.getByText('My Shelves')).toBeTruthy();
    expect(screen.getByText('Create New Shelf')).toBeTruthy();
  });

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
      isSuccess: true,
      message: 'Success',
      data: {
        entities: mockShelves,
        totalElements: 2,
        totalPages: 1,
        currentPage: 0,
        pageSize: 100,
      },
    });

    render(<OopslyApp />);
    
    // Wait for shelves to be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Shelf 1')).toBeTruthy();
      expect(screen.getByText('Test Shelf 2')).toBeTruthy();
    });
  });

  it('opens create shelf modal when clicking Create New Shelf', async () => {
    render(<OopslyApp />);
    
    await waitFor(() => {
      expect(mockFetchShelves).toHaveBeenCalled();
    });
    
    const createButton = screen.getByText('Create New Shelf');
    fireEvent.press(createButton);
    
    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter shelf name')).toBeTruthy();
    });
  });

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
});
