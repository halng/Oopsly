import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  nextReview: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

interface FlipCardProps {
  front: string;
  back: string;
  flipped: Animated.Value;
}

// Mock data for flashcards
const mockCards: Flashcard[] = [
  {
    id: '1',
    front: 'What is the capital of France?',
    back: 'Paris',
    deckId: 'deck1',
    nextReview: new Date(),
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
  },
  {
    id: '2',
    front: 'What is the chemical symbol for water?',
    back: 'H2O',
    deckId: 'deck1',
    nextReview: new Date(),
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
  },
  {
    id: '3',
    front: 'Who wrote "Romeo and Juliet"?',
    back: 'William Shakespeare',
    deckId: 'deck1',
    nextReview: new Date(),
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
  },
];

const { width } = Dimensions.get('window');

const FlipCard: React.FC<FlipCardProps> = ({ front, back, flipped }) => {
  const rotateYFront = flipped.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const rotateYBack = flipped.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const frontOpacity = flipped.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1, 0],
  });

  const backOpacity = flipped.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View className="relative w-full h-64">
      {/* Front of card */}
      <Animated.View
        className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 justify-center items-center border border-gray-200 dark:border-gray-700"
        style={[
          styles.card,
          {
            transform: [{ rotateY: rotateYFront }],
            opacity: frontOpacity,
          },
        ]}
      >
        <Text className="text-xl text-gray-800 dark:text-gray-100 text-center">{front}</Text>
      </Animated.View>

      {/* Back of card */}
      <Animated.View
        className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl shadow-lg p-6 justify-center items-center border border-blue-200 dark:border-blue-800"
        style={[
          styles.card,
          {
            transform: [{ rotateY: rotateYBack }],
            opacity: backOpacity,
          },
        ]}
      >
        <Text className="text-xl text-gray-800 dark:text-gray-100 text-center">{back}</Text>
      </Animated.View>
    </View>
  );
};

export default function StudyScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const [cards] = useState<Flashcard[]>(mockCards);

  const currentCard = cards[currentIndex];

  const flipCard = () => {
    if (!currentCard) return;
    
    const toValue = flipped ? 0 : 1;
    
    Animated.timing(flipAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setFlipped(!flipped);
  };

  const handleRating = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    // In a real app, this would update the card's scheduling based on SRS algorithm
    console.log(`Rated ${rating}`);
    
    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset to first card if at end
      setCurrentIndex(0);
    }
    
    // Reset flip state
    if (flipped) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start();
      setFlipped(false);
    }
  };

  if (!currentCard) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <View className="mt-12 mb-8">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
            <ChevronLeft color="#3B82F6" size={24} />
            <Text className="ml-2 text-blue-500 font-medium">Back</Text>
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-gray-500 dark:text-gray-400">No cards to study</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <View className="mt-12 mb-8">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
            <ChevronLeft color="#3B82F6" size={24} />
            <Text className="ml-2 text-blue-500 font-medium">Decks</Text>
          </TouchableOpacity>
          
          <Text className="text-gray-500 dark:text-gray-400">
            {currentIndex + 1}/{cards.length}
          </Text>
          
          <TouchableOpacity className="flex-row items-center">
            <RotateCcw color="#3B82F6" size={20} />
            <Text className="ml-1 text-blue-500 font-medium">Shuffle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-8">
        <View 
          className="h-full bg-blue-500 rounded-full" 
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </View>

      {/* Flashcard */}
      <View className="flex-1 justify-center items-center px-4">
        <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
          <FlipCard 
            front={currentCard.front} 
            back={currentCard.back} 
            flipped={flipAnimation} 
          />
        </TouchableOpacity>
        
        {!flipped && (
          <TouchableOpacity 
            onPress={flipCard}
            className="mt-6 py-2 px-4 bg-blue-100 dark:bg-blue-900/50 rounded-full"
          >
            <Text className="text-blue-600 dark:text-blue-300 font-medium">Tap to reveal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rating buttons */}
      {flipped && (
        <View className="mb-8 mx-4">
          <View className="flex-row justify-between">
            <TouchableOpacity 
              onPress={() => handleRating('again')}
              className="py-4 px-6 bg-red-500 rounded-xl flex-1 mr-2 items-center"
            >
              <Text className="text-white font-bold">Again</Text>
              <Text className="text-white text-xs mt-1">1m</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleRating('hard')}
              className="py-4 px-6 bg-orange-500 rounded-xl flex-1 mx-2 items-center"
            >
              <Text className="text-white font-bold">Hard</Text>
              <Text className="text-white text-xs mt-1">10m</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleRating('good')}
              className="py-4 px-6 bg-green-500 rounded-xl flex-1 mx-2 items-center"
            >
              <Text className="text-white font-bold">Good</Text>
              <Text className="text-white text-xs mt-1">1d</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleRating('easy')}
              className="py-4 px-6 bg-blue-500 rounded-xl flex-1 ml-2 items-center"
            >
              <Text className="text-white font-bold">Easy</Text>
              <Text className="text-white text-xs mt-1">3d</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width * 0.85,
    backfaceVisibility: 'hidden',
  },
});