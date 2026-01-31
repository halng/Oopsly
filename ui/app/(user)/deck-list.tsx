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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Plus, Package } from "lucide-react-native";
import { DeckCard } from "@/components/DeckCard";
import { DeckFormModal } from "@/components/DeckFormModal";
import { DeckService } from "@/services/DeckService";
import { Deck, CreateDeckVm } from "@/types/Deck";

const DeckList = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setError(null);
      const data = await DeckService.fetchDecks();
      setDecks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load decks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDecks();
  };

  const handleCreateDeck = () => {
    setEditingDeck(null);
    setModalVisible(true);
  };

  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setModalVisible(true);
  };

  const handleDeleteDeck = (id: string) => {
    Alert.alert(
      "Delete Deck",
      "Are you sure you want to delete this deck?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Optimistic update: remove from UI immediately
              setDecks((prevDecks) => prevDecks.filter((d) => d.id !== id));
              
              await DeckService.deleteDeck(id);
              
              // Refresh to ensure data consistency
              await loadDecks();
            } catch (err) {
              // Revert optimistic update on error
              await loadDecks();
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete deck"
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async (data: CreateDeckVm) => {
    try {
      setSubmitting(true);
      
      if (editingDeck) {
        await DeckService.updateDeck(editingDeck.id, data);
      } else {
        await DeckService.createDeck(data);
      }
      
      setModalVisible(false);
      setEditingDeck(null);
      
      // Refresh the list
      await loadDecks();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save deck"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingDeck(null);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading decks...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-800">Deck Management</Text>
          <View className="bg-blue-50 rounded-full px-3 py-1">
            <Text className="text-blue-600 font-semibold">{decks.length}</Text>
          </View>
        </View>
        <Text className="text-gray-600 mt-1">
          Organize your study materials into decks
        </Text>
      </View>

      {/* Error State */}
      {error && (
        <View className="bg-red-50 border border-red-200 mx-4 mt-4 p-4 rounded-xl">
          <Text className="text-red-800 font-semibold mb-1">Error</Text>
          <Text className="text-red-600">{error}</Text>
          <TouchableOpacity
            onPress={loadDecks}
            className="mt-3 bg-red-100 py-2 px-4 rounded-lg self-start"
          >
            <Text className="text-red-700 font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Deck List */}
      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onEdit={handleEditDeck}
            onDelete={handleDeleteDeck}
          />
        )}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 100,
        }}
        ListEmptyComponent={
          !error ? (
            <View className="items-center justify-center py-12 px-4">
              <View className="bg-gray-100 p-6 rounded-full mb-4">
                <Package size={48} color="#9CA3AF" />
              </View>
              <Text className="text-gray-800 font-bold text-lg mb-2">
                No Decks Yet
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Create your first deck to start organizing your study materials
              </Text>
              <TouchableOpacity
                onPress={handleCreateDeck}
                className="bg-blue-500 py-3 px-6 rounded-xl flex-row items-center"
                testID="create-first-deck-button"
              >
                <Plus size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold ml-2">
                  Create Deck
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        testID="deck-list"
      />

      {/* Floating Action Button */}
      {decks.length > 0 && (
        <TouchableOpacity
          onPress={handleCreateDeck}
          className="absolute bottom-6 right-6 bg-blue-500 w-16 h-16 rounded-full items-center justify-center shadow-lg"
          testID="create-deck-fab"
        >
          <Plus size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Form Modal */}
      <DeckFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingDeck={editingDeck}
        loading={submitting}
      />
    </View>
  );
};

export default DeckList;
