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
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { DeckList } from "../../../components/deck";
import { Deck } from "../../../types/Deck";

export default function DeckManagementScreen() {
  const router = useRouter();

  const handleDeckPress = (deck: Deck) => {
    // Navigate to deck detail/study screen
    router.push(`/study/${deck.id}`);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">
          Deck Management
        </Text>
        <Text className="text-gray-500 mt-1">
          Manage your flashcard decks
        </Text>
      </View>

      {/* Deck List */}
      <DeckList onDeckPress={handleDeckPress} />
    </View>
  );
}
