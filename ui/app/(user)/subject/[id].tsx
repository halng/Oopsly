import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Edit3, Save, X, Plus, Trash2, Settings, BookOpen, Check } from 'lucide-react-native';

// Dummy data for subjects
const subjectsData = [
  { 
    id: '1-1', 
    name: 'Data Structures', 
    progress: 65,
    cards: [
      { id: '1', front: 'What is a stack?', back: 'A LIFO (Last In, First Out) data structure' },
      { id: '2', front: 'What is a queue?', back: 'A FIFO (First In, First Out) data structure' },
      { id: '3', front: 'What is a binary tree?', back: 'A tree data structure where each node has at most two children' },
      { id: '4', front: 'Define hash table', back: 'A data structure that implements an associative array abstract data type' },
    ],
    settings: {
      dailyLimit: 20,
      newCardsPerDay: 5,
      intervalModifier: 100,
    }
  },
  { 
    id: '2-1', 
    name: 'Japanese Kanji N5', 
    progress: 40,
    cards: [
      { id: '1', front: '水', back: 'Water' },
      { id: '2', front: '火', back: 'Fire' },
      { id: '3', front: '木', back: 'Tree/Wood' },
      { id: '4', front: '金', back: 'Gold/Money' },
    ],
    settings: {
      dailyLimit: 15,
      newCardsPerDay: 3,
      intervalModifier: 100,
    }
  }
];

const SubjectDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  
  // Find the subject based on ID
  const initialSubject = subjectsData.find(sub => sub.id === id) || subjectsData[0];
  
  const [subject, setSubject] = useState(initialSubject);
  const [progress, setProgress] = useState(subject.progress);
  const [isEditing, setIsEditing] = useState(false);
  const [subjectName, setSubjectName] = useState(subject.name);
  const [cards, setCards] = useState(subject.cards);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState(subject.settings);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Save changes
      setSubject({ ...subject, name: subjectName, cards, settings });
    }
    setIsEditing(!isEditing);
  };

  // Add a new card
  const addNewCard = () => {
    if (newCard.front.trim() && newCard.back.trim()) {
      const newCardObj = {
        id: Date.now().toString(),
        front: newCard.front.trim(),
        back: newCard.back.trim()
      };
      setCards([...cards, newCardObj]);
      setNewCard({ front: '', back: '' });
      setShowAddCardModal(false);
    }
  };

  // Update an existing card
  const updateCard = () => {
    if (newCard.front.trim() && newCard.back.trim()) {
      const updatedCards = cards.map(card => 
        card.id === editingCardId 
          ? { ...card, front: newCard.front.trim(), back: newCard.back.trim() } 
          : card
      );
      setCards(updatedCards);
      setNewCard({ front: '', back: '' });
      setEditingCardId(null);
      setShowAddCardModal(false);
    }
  };

  // Delete a card
  const deleteCard = (cardId) => {
    Alert.alert(
      "Delete Card",
      "Are you sure you want to delete this card? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            const updatedCards = cards.filter(card => card.id !== cardId);
            setCards(updatedCards);
          }
        }
      ]
    );
  };

  // Open modal to edit card
  const openEditCardModal = (card) => {
    setNewCard({ front: card.front, back: card.back });
    setEditingCardId(card.id);
    setShowAddCardModal(true);
  };

  // Open modal to add new card
  const openAddCardModal = () => {
    setNewCard({ front: '', back: '' });
    setEditingCardId(null);
    setShowAddCardModal(true);
  };

  // Save settings
  const saveSettings = () => {
    setSubject({ ...subject, settings });
    setShowSettingsModal(false);
  };

  // Delete subject
  const deleteSubject = () => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to delete "${subjectName}"? All cards will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // In a real app, this would delete the subject from storage
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="p-2 -ml-2"
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#4B5563" />
            </TouchableOpacity>
            
            {isEditing ? (
              <TextInput
                className="text-xl font-bold text-gray-800 ml-2 flex-1 border-b border-indigo-300 py-1"
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="Subject name"
                autoFocus
              />
            ) : (
              <Text className="text-xl font-bold text-gray-800 ml-2">{subjectName}</Text>
            )}
          </View>
          
          <TouchableOpacity 
            className="p-2"
            onPress={toggleEditMode}
          >
            {isEditing ? (
              <Save size={20} color="#4F46E5" />
            ) : (
              <Edit3 size={20} color="#4B5563" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Progress Bar */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 font-medium">Progress</Text>
            <Text className="text-gray-600 font-medium">{progress}%</Text>
          </View>
          <View className="bg-gray-200 rounded-full h-3">
            <View 
              className="bg-indigo-500 h-3 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>
      
      {/* Main Actions */}
      <View className="px-4 mt-6">
        <TouchableOpacity 
          className="bg-indigo-600 rounded-xl py-5 mb-4 items-center shadow-sm"
          onPress={() => router.push(`/study/${subject.id}`)}
        >
          <Text className="text-white text-lg font-bold">Review Due Cards</Text>
          <Text className="text-indigo-200 mt-1">12 cards ready for review</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-white rounded-xl py-5 items-center border border-gray-200 mb-4"
          onPress={() => {}}
        >
          <Text className="text-gray-800 text-lg font-bold">Take AI Quiz</Text>
          <Text className="text-gray-500 mt-1">Generate personalized quiz</Text>
        </TouchableOpacity>
        
        {isEditing && (
          <View className="flex-col gap-3 mt-2">
            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
                onPress={openAddCardModal}
              >
                <Plus size={20} color="#4B5563" />
                <Text className="text-gray-800 font-bold ml-2">Add Card</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
                onPress={() => setShowSettingsModal(true)}
              >
                <Settings size={20} color="#4B5563" />
                <Text className="text-gray-800 font-bold ml-2">Settings</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              className="bg-red-50 rounded-xl py-4 items-center border border-red-200 flex-row justify-center"
              onPress={deleteSubject}
            >
              <Trash2 size={20} color="#EF4444" />
              <Text className="text-red-600 font-bold ml-2">Delete Subject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Card List */}
      <View className="mt-6 px-4 flex-1">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-700 font-bold">Cards in this deck</Text>
          <Text className="text-gray-500 text-sm">{cards.length} cards</Text>
        </View>
        
        {cards.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <BookOpen size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4 text-center">No cards in this deck yet</Text>
            {isEditing && (
              <TouchableOpacity 
                className="mt-4 bg-indigo-600 rounded-lg py-2 px-4"
                onPress={openAddCardModal}
              >
                <Text className="text-white font-medium">Add Your First Card</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
                {isEditing ? (
                  <>
                    <View className="flex-row justify-between">
                      <View className="flex-1">
                        <Text className="text-gray-800 font-medium">{item.front}</Text>
                        <Text className="text-gray-500 text-sm mt-1">{item.back}</Text>
                      </View>
                      <View className="flex-row">
                        <TouchableOpacity 
                          className="p-2 ml-2"
                          onPress={() => openEditCardModal(item)}
                        >
                          <Edit3 size={18} color="#4B5563" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          className="p-2"
                          onPress={() => deleteCard(item.id)}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {index === cards.length - 1 && (
                      <TouchableOpacity 
                        className="mt-3 flex-row items-center justify-center py-2 border-t border-gray-100"
                        onPress={openAddCardModal}
                      >
                        <Plus size={16} color="#4F46E5" />
                        <Text className="text-indigo-600 font-medium ml-1">Add Another Card</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <Text className="text-gray-800 font-medium">{item.front}</Text>
                    <Text className="text-gray-500 text-sm mt-1">{item.back}</Text>
                  </>
                )}
              </View>
            )}
          />
        )}
      </View>
      
      {/* Add/Edit Card Modal */}
      <Modal
        visible={showAddCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                {editingCardId ? "Edit Card" : "Add New Card"}
              </Text>
              <TouchableOpacity 
                className="p-2"
                onPress={() => setShowAddCardModal(false)}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Front</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Enter question or term"
                value={newCard.front}
                onChangeText={(text) => setNewCard({...newCard, front: text})}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Back</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Enter answer or definition"
                value={newCard.back}
                onChangeText={(text) => setNewCard({...newCard, back: text})}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <TouchableOpacity 
              className={`rounded-xl py-4 items-center ${
                newCard.front.trim() && newCard.back.trim() 
                  ? "bg-indigo-600" 
                  : "bg-gray-300"
              }`}
              disabled={!newCard.front.trim() || !newCard.back.trim()}
              onPress={editingCardId ? updateCard : addNewCard}
            >
              <Text className="text-white font-bold">
                {editingCardId ? "Update Card" : "Add Card"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">Study Settings</Text>
              <TouchableOpacity 
                className="p-2"
                onPress={() => setShowSettingsModal(false)}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Daily Card Limit</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Number of cards per day"
                value={settings.dailyLimit.toString()}
                onChangeText={(text) => setSettings({...settings, dailyLimit: parseInt(text) || 0})}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 text-sm mt-1">Maximum cards to study per day</Text>
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">New Cards Per Day</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Number of new cards"
                value={settings.newCardsPerDay.toString()}
                onChangeText={(text) => setSettings({...settings, newCardsPerDay: parseInt(text) || 0})}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 text-sm mt-1">Maximum new cards to introduce per day</Text>
            </View>
            
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Interval Modifier (%)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Percentage modifier"
                value={settings.intervalModifier.toString()}
                onChangeText={(text) => setSettings({...settings, intervalModifier: parseInt(text) || 100})}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 text-sm mt-1">Adjust how quickly intervals increase</Text>
            </View>
            
            <TouchableOpacity 
              className="bg-indigo-600 rounded-xl py-4 items-center"
              onPress={saveSettings}
            >
              <Text className="text-white font-bold">Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SubjectDetailScreen; 