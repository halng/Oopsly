import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Edit3,
  Save,
  X,
  Trash2,
  BookOpen,
  Clock,
} from "lucide-react-native";
import { deckService } from "@/services/deckService";
import { Deck } from "@/types/Deck";

export default function DeckManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deckId = params.id as string;

  const [deckData, setDeckData] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  const fetchDeck = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deckService.getDeckById(deckId);
      if (response.isSuccess) {
        setDeckData(response.data);
        setEditedName(response.data.name);
        setEditedDescription(response.data.description || "");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch deck";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (deckId) {
      fetchDeck();
    }
  }, [deckId, fetchDeck]);

  const handleEdit = () => {
    if (deckData) {
      setEditedName(deckData.name);
      setEditedDescription(deckData.description || "");
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editedName.trim().length === 0) {
      Alert.alert("Validation Error", "Deck name cannot be empty");
      return;
    }

    try {
      const response = await deckService.updateDeck(deckId, {
        name: editedName,
        description: editedDescription,
      });

      if (response.isSuccess) {
        setDeckData(response.data);
        setIsEditing(false);
        Alert.alert("Success", "Deck updated successfully");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update deck";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleCancel = () => {
    if (deckData) {
      setEditedName(deckData.name);
      setEditedDescription(deckData.description || "");
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Deck",
      "Are you sure you want to delete this deck? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await deckService.deleteDeck(deckId);
              if (response.isSuccess) {
                Alert.alert("Success", "Deck deleted successfully");
                router.back();
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Failed to delete deck";
              Alert.alert("Error", errorMessage);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-600 mt-4">Loading deck...</Text>
      </View>
    );
  }

  if (error || !deckData) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          {error ? "Error Loading Deck" : "Deck Not Found"}
        </Text>
        <Text className="text-gray-600 text-center mb-4">
          {error || "The deck you're looking for doesn't exist."}
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Deck Management
          </Text>
          {isEditing ? (
            <View className="flex-row">
              <TouchableOpacity
                className="p-2 mr-2 bg-gray-200 rounded-full"
                onPress={handleCancel}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 bg-indigo-600 rounded-full"
                onPress={handleSave}
              >
                <Save size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="p-2 bg-indigo-600 rounded-full"
              onPress={handleEdit}
            >
              <Edit3 size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Deck Preview Card */}
        <View className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-xl bg-indigo-100 items-center justify-center mr-4">
              <BookOpen size={32} color="#6366F1" />
            </View>
            {isEditing ? (
              <TextInput
                className="flex-1 text-lg font-bold text-gray-900 border-b border-indigo-300 py-1"
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Deck name"
              />
            ) : (
              <Text className="text-xl font-bold text-gray-900 flex-1">
                {deckData.name}
              </Text>
            )}
          </View>

          {isEditing ? (
            <TextInput
              className="text-gray-600 mb-4 border-b border-gray-300 py-1"
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Deck description"
              multiline
            />
          ) : (
            <Text className="text-gray-600 mb-4">{deckData.description}</Text>
          )}

          <View className="flex-row justify-between mt-4">
            <View className="flex-row items-center">
              <Clock size={16} color="#6B7280" />
              <Text className="text-gray-500 ml-2">
                Created: {new Date(deckData.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text className="text-gray-500">
              Updated: {new Date(deckData.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="bg-white rounded-xl shadow-sm p-5">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Deck Actions
          </Text>

          <TouchableOpacity
            className="flex-row items-center p-4 bg-red-50 rounded-lg"
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text className="text-red-600 font-medium ml-3">Delete Deck</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
