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
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";
import { Deck, CreateDeckVm } from "@/types/Deck";

interface DeckFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeckVm) => void;
  editingDeck?: Deck | null;
  loading?: boolean;
}

export const DeckFormModal: React.FC<DeckFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  editingDeck,
  loading = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    if (editingDeck) {
      setTitle(editingDeck.title);
      setDescription(editingDeck.description);
    } else {
      setTitle("");
      setDescription("");
    }
    setErrors({});
  }, [editingDeck, visible]);

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ title: title.trim(), description: description.trim() });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                <Text className="text-xl font-bold text-gray-800">
                  {editingDeck ? "Edit Deck" : "Create New Deck"}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-gray-100 p-2 rounded-full"
                  testID="close-modal"
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View className="p-4">
                {/* Title Input */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Title <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter deck title"
                    className={`bg-gray-50 border ${
                      errors.title ? "border-red-500" : "border-gray-200"
                    } rounded-xl px-4 py-3 text-gray-800`}
                    testID="deck-title-input"
                  />
                  {errors.title && (
                    <Text className="text-red-500 text-xs mt-1">{errors.title}</Text>
                  )}
                </View>

                {/* Description Input */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Description <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter deck description"
                    multiline
                    numberOfLines={4}
                    className={`bg-gray-50 border ${
                      errors.description ? "border-red-500" : "border-gray-200"
                    } rounded-xl px-4 py-3 text-gray-800`}
                    style={{ textAlignVertical: "top" }}
                    testID="deck-description-input"
                  />
                  {errors.description && (
                    <Text className="text-red-500 text-xs mt-1">{errors.description}</Text>
                  )}
                </View>

                {/* Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={onClose}
                    className="flex-1 bg-gray-100 py-4 rounded-xl"
                    testID="cancel-button"
                  >
                    <Text className="text-center text-gray-700 font-semibold">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className={`flex-1 py-4 rounded-xl ${
                      loading ? "bg-blue-300" : "bg-blue-500"
                    }`}
                    testID="submit-button"
                  >
                    <Text className="text-center text-white font-semibold">
                      {loading ? "Saving..." : editingDeck ? "Update" : "Create"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
