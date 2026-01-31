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
import { DeckCard } from '../../components/DeckCard';
import { Deck } from '../../types/Deck';

describe('DeckCard', () => {
  const mockDeck: Deck = {
    id: 'deck-123',
    title: 'Japanese Vocabulary',
    description: 'Basic Japanese words for beginners',
    createdAt: '2025-12-14T10:00:00.000Z',
  };

  const mockDeckWithoutDescription: Deck = {
    id: 'deck-456',
    title: 'Math Formulas',
    description: '',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders deck title correctly', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Japanese Vocabulary')).toBeTruthy();
  });

  it('renders deck description when provided', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Basic Japanese words for beginners')).toBeTruthy();
  });

  it('does not render description when empty', () => {
    render(
      <DeckCard
        deck={mockDeckWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText('Basic Japanese words for beginners')).toBeNull();
  });

  it('renders formatted date correctly', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Created: 12\/14\/2025/)).toBeTruthy();
  });

  it('calls onEdit when edit button is pressed', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByTestId('edit-deck-deck-123');
    fireEvent.press(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockDeck);
  });

  it('calls onDelete when delete button is pressed', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-deck-deck-123');
    fireEvent.press(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockDeck.id);
  });

  it('renders with correct testIDs', () => {
    render(
      <DeckCard
        deck={mockDeck}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('edit-deck-deck-123')).toBeTruthy();
    expect(screen.getByTestId('delete-deck-deck-123')).toBeTruthy();
  });
});
