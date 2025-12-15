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
import { View, Text, TouchableOpacity } from 'react-native';
import { BookOpen, Edit3, Trash2 } from 'lucide-react-native';
import { Deck } from '../../types/Deck';

interface DeckCardProps {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
  onPress?: (deck: Deck) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, onEdit, onDelete, onPress }) => {
  const formattedDate = new Date(deck.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      className="bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100"
      onPress={() => onPress?.(deck)}
      activeOpacity={0.7}
      testID={`deck-card-${deck.id}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 rounded-lg bg-indigo-100 items-center justify-center mr-3">
              <BookOpen size={20} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                {deck.name}
              </Text>
              <Text className="text-xs text-gray-400">Updated {formattedDate}</Text>
            </View>
          </View>
          {deck.description && (
            <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
              {deck.description}
            </Text>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-1"
            onPress={() => onEdit(deck)}
            testID={`deck-edit-${deck.id}`}
          >
            <Edit3 size={18} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => onDelete(deck)}
            testID={`deck-delete-${deck.id}`}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
