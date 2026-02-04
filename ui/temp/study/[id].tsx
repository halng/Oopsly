import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

// Sample flashcard data
const sampleCards = [
  { id: '1', front: 'What is the time complexity of binary search?', back: 'O(log n)' },
  { id: '2', front: 'What does FIFO stand for?', back: 'First In, First Out' },
  { id: '3', front: 'What is a stack?', back: 'A LIFO (Last In, First Out) data structure' },
  { id: '4', front: 'What is the purpose of a hash function?', back: 'To map data of arbitrary size to fixed-size values' },
];

const StudyModeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Animation values
  const flipAnimation = new Animated.Value(0);
  
  // Handle card flip
  const flipCard = () => {
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
    });
  };
  
  // Handle SRS rating
  const handleRating = (rating) => {
    // In a real app, this would save the rating and schedule the card
    // For now, we'll just move to the next card
    
    if (currentCardIndex < sampleCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Reset to first card when reaching the end
      setCurrentCardIndex(0);
    }
    
    // Reset flip state for next card
    if (isFlipped) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
        setIsFlipped(false);
      });
    }
  };
  
  // Interpolate animation values for flip effect
  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0]
  });
  
  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });
  
  const rotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  
  const currentCard = sampleCards[currentCardIndex];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="p-2 -ml-2"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800 ml-2">Review Session</Text>
        </View>
        
        <View className="mt-3 flex-row items-center">
          <View className="flex-1 bg-gray-200 rounded-full h-2">
            <View 
              className="bg-indigo-500 h-2 rounded-full" 
              style={{ width: `${((currentCardIndex + 1) / sampleCards.length) * 100}%` }}
            />
          </View>
          <Text className="text-gray-600 text-sm ml-2">
            {currentCardIndex + 1}/{sampleCards.length}
          </Text>
        </View>
      </View>
      
      {/* Flashcard */}
      <View className="flex-1 items-center justify-center px-6">
        <TouchableOpacity 
          className="w-full"
          onPress={flipCard}
          activeOpacity={0.9}
        >
          <View className="relative w-full h-80">
            {/* Front of card */}
            <Animated.View 
              className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 items-center justify-center"
              style={[
                styles.card,
                { opacity: frontOpacity, transform: [{ rotateY }] }
              ]}
            >
              <Text className="text-gray-800 text-xl text-center">
                {currentCard.front}
              </Text>
              <Text className="text-gray-400 text-sm mt-4">Tap to reveal</Text>
            </Animated.View>
            
            {/* Back of card */}
            <Animated.View 
              className="absolute inset-0 bg-indigo-50 rounded-2xl shadow-lg p-6 items-center justify-center"
              style={[
                styles.card,
                { 
                  opacity: backOpacity, 
                  transform: [{ rotateY: rotateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['180deg', '360deg']
                  }) }] 
                }
              ]}
            >
              <Text className="text-indigo-800 text-xl text-center font-medium">
                {currentCard.back}
              </Text>
              <Text className="text-indigo-400 text-sm mt-4">Tap to flip back</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* SRS Rating Buttons */}
      <View className="px-6 pb-8">
        <View className="flex-row justify-between">
          <TouchableOpacity 
            className="bg-red-500 rounded-xl py-4 px-2 flex-1 items-center mx-1"
            onPress={() => handleRating('again')}
          >
            <Text className="text-white font-bold">Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-orange-500 rounded-xl py-4 px-2 flex-1 items-center mx-1"
            onPress={() => handleRating('hard')}
          >
            <Text className="text-white font-bold">Hard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-green-500 rounded-xl py-4 px-2 flex-1 items-center mx-1"
            onPress={() => handleRating('good')}
          >
            <Text className="text-white font-bold">Good</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-blue-500 rounded-xl py-4 px-2 flex-1 items-center mx-1"
            onPress={() => handleRating('easy')}
          >
            <Text className="text-white font-bold">Easy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backfaceVisibility: 'hidden',
  }
});

export default StudyModeScreen;