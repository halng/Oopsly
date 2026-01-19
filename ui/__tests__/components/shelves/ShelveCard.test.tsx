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

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ShelveCard } from '../../../components/shelves/ShelveCard';
import { Shelve } from '../../../types/Shelve';

describe('ShelveCard', () => {
  const mockShelve: Shelve = {
    id: 'shelve-123',
    name: 'Japanese Vocabulary',
    description: 'Basic Japanese words for beginners',
    createdAt: '2025-12-14T10:00:00.000Z',
    updatedAt: '2025-12-14T15:30:00.000Z',
  };

  const mockShelveWithoutDescription: Shelve = {
    id: 'shelve-456',
    name: 'Math Formulas',
    description: null,
    createdAt: '2025-12-14T10:00:00.000Z',
    updatedAt: '2025-12-14T10:00:00.000Z',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shelve name correctly', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
  });

  it('renders shelve description when provided', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Basic Japanese words for beginners')).toBeTruthy();
  });

  it('does not render description when null', () => {
    render(
      <ShelveCard
        shelve={mockShelveWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText('Basic Japanese words for beginners')).toBeNull();
  });

  it('renders formatted date correctly', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // The date should be formatted as "Dec 14, 2025"
    expect(screen.getByText(/Updated Dec 14, 2025/)).toBeTruthy();
  });

  it('calls onEdit when edit button is pressed', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByTestId('shelve-edit-shelve-123');
    fireEvent.press(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockShelve);
  });

  it('calls onDelete when delete button is pressed', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTestId('shelve-delete-shelve-123');
    fireEvent.press(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockShelve);
  });

  it('calls onPress when card is pressed', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPress={mockOnPress}
      />
    );

    const card = screen.getByTestId('shelve-card-shelve-123');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockShelve);
  });

  it('does not crash when onPress is not provided and card is pressed', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByTestId('shelve-card-shelve-123');
    // Should not throw when pressed
    expect(() => fireEvent.press(card)).not.toThrow();
  });

  it('renders with correct testID', () => {
    render(
      <ShelveCard
        shelve={mockShelve}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('shelve-card-shelve-123')).toBeTruthy();
    expect(screen.getByTestId('shelve-edit-shelve-123')).toBeTruthy();
    expect(screen.getByTestId('shelve-delete-shelve-123')).toBeTruthy();
  });
});
