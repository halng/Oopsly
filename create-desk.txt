import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Image as ImageIcon, Palette, BookOpen, ChevronRight } from 'lucide-react-native';

const CreateDeckScreen = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [deckColor, setDeckColor] = useState('#3B82F6');

  const categories = ['General', 'Languages', 'Science', 'History', 'Mathematics', 'Literature', 'Art', 'Technology'];
  const colorOptions = ['#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'];

  const handleCreateDeck = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a deck title');
      return;
    }

    // In a real app, this would save to a database
    console.log('Creating deck:', { title, description, category, coverImage, deckColor });
    
    // Navigate to create card screen after deck creation
    router.push('/create-card');
  };

  const selectCoverImage = () => {
    // In a real app, this would open an image picker
    // For now, we'll use a placeholder
    setCoverImage('https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60');
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Create New Deck</Text>
        <Text className="text-gray-600 dark:text-gray-300 mt-1">Build your personalized flashcard collection</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deck Title</Text>
          <TextInput
            className="bg-white dark:bg-gray-800 rounded-xl p-4 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            placeholder="Enter deck title"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</Text>
          <TextInput
            className="bg-white dark:bg-gray-800 rounded-xl p-4 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 h-24"
            placeholder="Describe your deck..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Category Selection */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-3">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`px-4 py-2 rounded-full ${
                  category === cat
                    ? 'bg-blue-500'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
                onPress={() => setCategory(cat)}
              >
                <Text
                  className={`font-medium ${
                    category === cat ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cover Customization */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deck Cover</Text>
          
          {/* Color Picker */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center mb-3">
              <Palette size={20} color="#4B5563" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300 font-medium">Cover Color</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-10 h-10 rounded-full ${deckColor === color ? 'border-2 border-gray-800 dark:border-white' : ''}`}
                  style={{ backgroundColor: color }}
                  onPress={() => setDeckColor(color)}
                />
              ))}
            </View>
          </View>

          {/* Image Selector */}
          <TouchableOpacity 
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
            onPress={selectCoverImage}
          >
            <View className="flex-row items-center">
              <ImageIcon size={20} color="#4B5563" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300 font-medium">
                {coverImage ? 'Change Cover Image' : 'Add Cover Image'}
              </Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Preview Cover */}
          {coverImage && (
            <View className="mt-4 rounded-xl overflow-hidden">
              <Image 
                source={{ uri: coverImage }} 
                className="w-full h-40"
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* Initial Card Creation */}
        <View className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center mb-2">
            <BookOpen size={20} color="#4B5563" />
            <Text className="ml-2 text-gray-700 dark:text-gray-300 font-medium">Initial Cards</Text>
          </View>
          <Text className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            You can add cards to your deck after creation
          </Text>
          <TouchableOpacity className="flex-row items-center">
            <Plus size={16} color="#3B82F6" />
            <Text className="ml-1 text-blue-500 font-medium">Add First Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="px-4 pb-6">
        <TouchableOpacity
          className="bg-blue-500 rounded-xl py-4 flex-row items-center justify-center"
          onPress={handleCreateDeck}
        >
          <Plus size={20} color="white" />
          <Text className="text-white text-lg font-bold ml-2">Create Deck</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreateDeckScreen;