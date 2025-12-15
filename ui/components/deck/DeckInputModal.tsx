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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Deck, CreateDeckVm, UpdateDeckVm } from '../../types/Deck';

interface DeckInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeckVm | UpdateDeckVm) => Promise<void>;
  deck?: Deck | null;
  isLoading?: boolean;
}

export const DeckInputModal: React.FC<DeckInputModalProps> = ({
  visible,
  onClose,
  onSubmit,
  deck,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const isEditing = !!deck;

  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [deck, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Deck name is required');
      return;
    }

    try {
      setError('');
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Deck' : 'Create New Deck'}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                testID="modal-close-button"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View className="bg-red-50 rounded-lg p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholder="Enter deck name"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                testID="deck-name-input"
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholder="Enter deck description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isLoading}
                testID="deck-description-input"
              />
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-lg py-4 mr-2 items-center"
                onPress={handleClose}
                disabled={isLoading}
                testID="modal-cancel-button"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-lg py-4 ml-2 items-center flex-row justify-center"
                onPress={handleSubmit}
                disabled={isLoading}
                testID="modal-submit-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-semibold">
                    {isEditing ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
