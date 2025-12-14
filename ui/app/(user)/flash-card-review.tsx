import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Vibration, Animated, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { Volume2, RotateCcw, BookOpen, CheckCircle, XCircle } from 'lucide-react-native';
import * as Speech from 'expo-speech';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock flashcard data
const mockFlashcards = [
  {
    id: '1',
    front: 'What is the capital of France?',
    back: 'Paris',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: Date.now(),
  },
  {
    id: '2',
    front: 'What is the chemical symbol for gold?',
    back: 'Au',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: Date.now(),
  },
  {
    id: '3',
    front: 'Who wrote "Romeo and Juliet"?',
    back: 'William Shakespeare',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: Date.now(),
  },
  {
    id: '4',
    front: 'What is the largest planet in our solar system?',
    back: 'Jupiter',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: Date.now(),
  },
];

// Spaced Repetition Algorithm (SM-2 simplified)
const calculateNextReview = (card: any, rating: number) => {
  let { interval, easeFactor, repetitions } = card;
  
  if (rating === 0) { // Again
    repetitions = 0;
    interval = 1;
  } else if (rating === 1) { // Hard
    repetitions = 0;
    interval = Math.round(interval * 1.2);
  } else if (rating === 2) { // Good
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else if (rating === 3) { // Easy
    repetitions += 1;
    easeFactor += 0.1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }
  
  // Update ease factor based on rating
  easeFactor = easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  
  const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);
  
  return { ...card, interval, easeFactor, repetitions, nextReview };
};

export default function FlashcardReviewScreen() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState(mockFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, total: mockFlashcards.length });
  
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });
  
  const nextCardScale = position.y.interpolate({
    inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
    outputRange: [1, 0.8, 1],
    extrapolate: 'clamp'
  });
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          // Swipe right - Good/Easy
          swipeCard('right');
        } else if (gesture.dx < -120) {
          // Swipe left - Hard/Again
          swipeCard('left');
        } else {
          // Return to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;
  
  const speakText = (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };
  
  const flipCard = () => {
    Vibration.vibrate(5);
    setIsFlipped(!isFlipped);
  };
  
  const swipeCard = (direction: 'left' | 'right') => {
    Vibration.vibrate(10);
    
    // Apply animation
    Animated.timing(position, {
      toValue: { 
        x: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH, 
        y: 0 
      },
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      // Calculate next review based on swipe direction
      const rating = direction === 'right' ? 2 : 0; // Good vs Again
      
      // Update the card with spaced repetition algorithm
      const updatedCard = calculateNextReview(flashcards[currentIndex], rating);
      
      // Update flashcards array
      const updatedCards = [...flashcards];
      updatedCards[currentIndex] = updatedCard;
      
      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
      } else {
        // End of session
        router.push('/study-planner');
      }
      
      // Reset position and flip state
      position.setValue({ x: 0, y: 0 });
      setIsFlipped(false);
    });
  };
  
  const handleRatingPress = (rating: number) => {
    Vibration.vibrate(10);
    
    // Update the card with spaced repetition algorithm
    const updatedCard = calculateNextReview(flashcards[currentIndex], rating);
    
    // Update flashcards array
    const updatedCards = [...flashcards];
    updatedCards[currentIndex] = updatedCard;
    
    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
    } else {
      // End of session
      router.push('/study-planner');
    }
    
    // Reset position and flip state
    position.setValue({ x: 0, y: 0 });
    setIsFlipped(false);
  };
  
  const resetSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ reviewed: 0, total: mockFlashcards.length });
    position.setValue({ x: 0, y: 0 });
  };
  
  if (currentIndex >= flashcards.length) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center p-6">
        <View className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md items-center">
          <CheckCircle size={80} color="#8BC34A" className="mb-6" />
          <Text className="text-2xl font-bold text-gray-800 mb-2">Session Complete!</Text>
          <Text className="text-gray-600 text-center mb-6">
            You've reviewed all {mockFlashcards.length} flashcards
          </Text>
          <TouchableOpacity 
            onPress={resetSession}
            className="bg-green-500 py-3 px-6 rounded-full mb-4"
          >
            <Text className="text-white font-semibold">Review Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/study-planner')}
            className="py-3 px-6 rounded-full"
          >
            <Text className="text-gray-600 font-medium">Back to Planner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const currentCard = flashcards[currentIndex];
  
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="pt-12 pb-4 px-4 bg-white shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <XCircle size={28} color="#757575" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Flashcard Review</Text>
          <TouchableOpacity onPress={resetSession}>
            <RotateCcw size={24} color="#757575" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <BookOpen size={20} color="#8BC34A" className="mr-2" />
            <Text className="font-semibold text-gray-700">
              {sessionStats.reviewed + 1} of {sessionStats.total}
            </Text>
          </View>
          
          <View className="flex-row">
            <View className="h-2 w-8 bg-green-500 rounded-full mr-1" />
            <View className="h-2 w-8 bg-green-300 rounded-full mr-1" />
            <View className="h-2 w-8 bg-gray-200 rounded-full" />
          </View>
        </View>
      </View>
      
      {/* Progress Bar */}
      <View className="h-1 bg-gray-200">
        <View 
          className="h-full bg-green-500" 
          style={{ width: `${((sessionStats.reviewed + 1) / sessionStats.total) * 100}%` }} 
        />
      </View>
      
      {/* Flashcard Area */}
      <View className="flex-1 justify-center items-center p-4">
        {/* Next Card Indicator */}
        {currentIndex < flashcards.length - 1 && (
          <Animated.View 
            style={[
              styles.nextCard,
              { transform: [{ scale: nextCardScale }] }
            ]}
            className="absolute bg-gray-100 rounded-2xl w-80 h-48 opacity-70"
          />
        )}
        
        {/* Current Card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate }
              ]
            }
          ]}
          className="bg-white rounded-2xl shadow-lg w-80 h-48 absolute"
        >
          <TouchableOpacity 
            onPress={flipCard}
            activeOpacity={0.9}
            className="flex-1 justify-center items-center p-6"
          >
            {!isFlipped ? (
              <>
                <Text className="text-lg text-center text-gray-800 font-medium mb-4">
                  {currentCard.front}
                </Text>
                <View className="flex-row items-center mt-auto">
                  <Volume2 
                    size={20} 
                    color="#8BC34A" 
                    onPress={() => speakText(currentCard.front)} 
                  />
                  <Text className="text-gray-500 text-sm ml-2">Tap to reveal answer</Text>
                </View>
              </>
            ) : (
              <>
                <Text className="text-lg text-center text-gray-800 font-medium mb-4">
                  {currentCard.back}
                </Text>
                <View className="flex-row items-center mt-auto">
                  <Volume2 
                    size={20} 
                    color="#8BC34A" 
                    onPress={() => speakText(currentCard.back)} 
                  />
                  <Text className="text-gray-500 text-sm ml-2">Tap to see question</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Rating Buttons */}
      <View className="p-4 bg-white pt-6">
        <Text className="text-center text-gray-600 mb-4 font-medium">How well did you know this?</Text>
        <View className="flex-row justify-between">
          <TouchableOpacity 
            onPress={() => handleRatingPress(0)}
            className="items-center flex-1 mx-1 py-3 bg-red-100 rounded-xl"
          >
            <Text className="text-red-600 font-bold">Again</Text>
            <Text className="text-red-500 text-xs mt-1">1 day</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleRatingPress(1)}
            className="items-center flex-1 mx-1 py-3 bg-orange-100 rounded-xl"
          >
            <Text className="text-orange-600 font-bold">Hard</Text>
            <Text className="text-orange-500 text-xs mt-1">1.2 days</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleRatingPress(2)}
            className="items-center flex-1 mx-1 py-3 bg-blue-100 rounded-xl"
          >
            <Text className="text-blue-600 font-bold">Good</Text>
            <Text className="text-blue-500 text-xs mt-1">4 days</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleRatingPress(3)}
            className="items-center flex-1 mx-1 py-3 bg-green-100 rounded-xl"
          >
            <Text className="text-green-600 font-bold">Easy</Text>
            <Text className="text-green-500 text-xs mt-1">1 week</Text>
          </TouchableOpacity>
        </View>
        
        <View className="flex-row justify-between mt-6">
          <TouchableOpacity 
            onPress={() => swipeCard('left')}
            className="flex-row items-center py-3 px-6 bg-red-500 rounded-full"
          >
            <XCircle size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold">Hard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => swipeCard('right')}
            className="flex-row items-center py-3 px-6 bg-green-500 rounded-full"
          >
            <CheckCircle size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold">Good</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  nextCard: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  }
});