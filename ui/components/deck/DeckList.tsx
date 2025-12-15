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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Plus, AlertCircle } from 'lucide-react-native';
import { Deck, CreateDeckVm, UpdateDeckVm } from '../../types/Deck';
import { deckService } from '../../services/deckService';
import { DeckCard } from './DeckCard';
import { DeckInputModal } from './DeckInputModal';

interface DeckListProps {
  onDeckPress?: (deck: Deck) => void;
}

export const DeckList: React.FC<DeckListProps> = ({ onDeckPress }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDecks = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await deckService.fetchDecks();
      setDecks(response.data?.content || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch decks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleCreateDeck = () => {
    setSelectedDeck(null);
    setModalVisible(true);
  };

  const handleEditDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    setModalVisible(true);
  };

  const handleDeleteDeck = (deck: Deck) => {
    Alert.alert(
      'Delete Deck',
      `Are you sure you want to delete "${deck.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update - remove from UI immediately
            setDecks((prev) => prev.filter((d) => d.id !== deck.id));

            try {
              await deckService.deleteDeck(deck.id);
            } catch (err) {
              // Revert optimistic update on error
              setDecks((prev) => [...prev, deck].sort((a, b) => 
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              ));
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete deck'
              );
            }
          },
        },
      ]
    );
  };

  const handleModalSubmit = async (data: CreateDeckVm | UpdateDeckVm) => {
    setIsSubmitting(true);
    try {
      if (selectedDeck) {
        // Update existing deck
        await deckService.updateDeck(selectedDeck.id, data);
      } else {
        // Create new deck
        await deckService.createDeck(data);
      }
      setModalVisible(false);
      setSelectedDeck(null);
      await fetchDecks();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedDeck(null);
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-4">
        <Plus size={32} color="#4F46E5" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2">No decks yet</Text>
      <Text className="text-gray-500 text-center px-8 mb-6">
        Create your first deck to start organizing your flashcards
      </Text>
      <TouchableOpacity
        className="bg-indigo-600 rounded-lg px-6 py-3"
        onPress={handleCreateDeck}
        testID="create-first-deck-button"
        accessibilityLabel="Create your first deck"
        accessibilityHint="Opens a dialog to create a new deck"
      >
        <Text className="text-white font-semibold">Create Your First Deck</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
        <AlertCircle size={32} color="#EF4444" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</Text>
      <Text className="text-gray-500 text-center px-8 mb-6">{error}</Text>
      <TouchableOpacity
        className="bg-indigo-600 rounded-lg px-6 py-3"
        onPress={() => fetchDecks()}
        testID="retry-button"
        accessibilityLabel="Try again"
        accessibilityHint="Retry loading the deck list"
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-500 mt-4">Loading decks...</Text>
      </View>
    );
  }

  if (error && decks.length === 0) {
    return renderErrorState();
  }

  return (
    <View className="flex-1">
      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onEdit={handleEditDeck}
            onDelete={handleDeleteDeck}
            onPress={onDeckPress}
          />
        )}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchDecks(true)}
            colors={['#4F46E5']}
          />
        }
        testID="deck-list"
      />

      {/* Floating Action Button */}
      {decks.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
          onPress={handleCreateDeck}
          testID="fab-create-deck"
          accessibilityLabel="Create new deck"
          accessibilityHint="Opens a dialog to create a new deck"
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      )}

      <DeckInputModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        deck={selectedDeck}
        isLoading={isSubmitting}
      />
    </View>
  );
};
