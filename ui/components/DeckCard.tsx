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

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Trash2, Edit } from "lucide-react-native";
import { Deck } from "@/types/Deck";

interface DeckCardProps {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (id: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, onEdit, onDelete }) => {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 mx-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-gray-800 text-lg mb-1">
            {deck.title}
          </Text>
          {deck.description && (
            <Text className="text-gray-600 text-sm" numberOfLines={2}>
              {deck.description}
            </Text>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => onEdit(deck)}
            className="bg-blue-50 p-2 rounded-lg"
            testID={`edit-deck-${deck.id}`}
          >
            <Edit size={20} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(deck.id)}
            className="bg-red-50 p-2 rounded-lg"
            testID={`delete-deck-${deck.id}`}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {deck.createdAt && (
        <Text className="text-gray-400 text-xs mt-2">
          Created: {new Date(deck.createdAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};
