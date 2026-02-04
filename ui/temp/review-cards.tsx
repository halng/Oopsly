import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, Lightbulb, RotateCcw } from 'lucide-react-native';

// Question type enum
type QuestionType = 'multiple-choice' | 'single-choice' | 'true-false' | 'fill-blank' | 'matching';

// Card interface with SRS properties
interface Flashcard {
  id: string;
  front: string;
  back: string;
  type: QuestionType;
  options?: string[]; // For multiple/single choice
  answer?: string; // For fill in the blank
  pairs?: { left: string; right: string }[]; // For matching
  // SRS properties
  interval: number; // Days until next review
  repetition: number; // Number of times reviewed
  easeFactor: number; // Difficulty factor (1.3-2.5)
  dueDate: Date; // Next review date
  lastReviewed?: Date; // Last review date
}

// Sample flashcard data with different question types
const sampleCards: Flashcard[] = [
  {
    id: '1',
    front: 'What is the time complexity of binary search?',
    back: 'O(log n)',
    type: 'single-choice',
    options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    dueDate: new Date(),
  },
  {
    id: '2',
    front: 'Which of the following are sorting algorithms?',
    back: 'Bubble sort, Merge sort, Quick sort',
    type: 'multiple-choice',
    options: ['Bubble sort', 'Binary search', 'Merge sort', 'Depth-first search', 'Quick sort'],
    interval: 1,
    repetition: 1,
    easeFactor: 2.3,
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
  },
  {
    id: '3',
    front: 'A stack follows the Last In, First Out (LIFO) principle.',
    back: 'True',
    type: 'true-false',
    interval: 2,
    repetition: 2,
    easeFactor: 2.1,
    dueDate: new Date(Date.now() + 172800000), // In 2 days
  },
  {
    id: '4',
    front: 'The capital of France is _________.',
    back: 'Paris',
    type: 'fill-blank',
    answer: 'Paris',
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    dueDate: new Date(),
  },
  {
    id: '5',
    front: 'Match the data structures with their principles:',
    back: 'Stack: LIFO, Queue: FIFO, Tree: Hierarchical',
    type: 'matching',
    pairs: [
      { left: 'Stack', right: 'LIFO' },
      { left: 'Queue', right: 'FIFO' },
      { left: 'Tree', right: 'Hierarchical' }
    ],
    interval: 3,
    repetition: 1,
    easeFactor: 2.0,
    dueDate: new Date(Date.now() + 259200000), // In 3 days
  },
];

// Spaced Repetition Algorithm (SM-2)
const calculateNextReview = (card: Flashcard, quality: number) => {
  let { interval, repetition, easeFactor } = card;
  
  // Quality: 0-5 (0=again, 1=hard, 2=good, 3=easy, etc.)
  if (quality < 3) {
    // Failed to recall - reset repetition count
    repetition = 0;
  } else {
    // Successfully recalled
    repetition += 1;
    
    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }
  
  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  
  // Calculate next due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  
  return { interval, repetition, easeFactor, dueDate };
};

const ReviewCardsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { mode } = params; // learn, review, practice
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<{ [key: string]: string }>({});
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  
  // Filter cards based on mode
  const filteredCards = sampleCards.filter(card => {
    if (mode === 'learn') return card.repetition === 0; // New cards
    if (mode === 'review') return card.dueDate <= new Date(); // Due cards
    return true; // Practice mode - all cards
  });
  
  // Animation values
  const flipAnimation = new Animated.Value(0);
  
  // Get current card
  const currentCard = filteredCards[currentCardIndex];
  
  // Handle card flip
  const flipCard = () => {
    if (currentCard.type === 'fill-blank' || currentCard.type === 'matching') return;
    
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
    });
  };
  
  // Handle answer selection for multiple/single choice
  const toggleAnswerSelection = (option: string) => {
    if (currentCard.type === 'single-choice') {
      setSelectedAnswers([option]);
    } else if (currentCard.type === 'multiple-choice') {
      if (selectedAnswers.includes(option)) {
        setSelectedAnswers(selectedAnswers.filter(ans => ans !== option));
      } else {
        setSelectedAnswers([...selectedAnswers, option]);
      }
    }
  };
  
  // Handle matching pair selection
  const selectMatchingPair = (left: string, right: string) => {
    setMatchedPairs({ ...matchedPairs, [left]: right });
  };
  
  // Handle SRS rating
  const handleRating = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    // Convert rating to quality score (0-5)
    const qualityMap = { again: 0, hard: 1, good: 3, easy: 4 };
    const quality = qualityMap[rating];
    
    // Update card based on SRS algorithm
    if (currentCard) {
      const updatedCard = calculateNextReview(currentCard, quality);
      console.log(`Updated card ${currentCard.id}:`, updatedCard);
      
      // Update stats
      if (quality >= 2) {
        setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      }
      setSessionStats(prev => ({ ...prev, total: prev.total + 1 }));
    }
    
    // Move to next card or finish session
    if (currentCardIndex < filteredCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // End of session - could navigate to results screen
      router.back();
    }
    
    // Reset state for next card
    resetCardState();
  };
  
  // Reset card-specific state
  const resetCardState = () => {
    if (isFlipped) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
        setIsFlipped(false);
      });
    }
    setSelectedAnswers([]);
    setMatchedPairs({});
    setShowHint(false);
  };
  
  // Show hint for current card
  const toggleHint = () => {
    setShowHint(!showHint);
  };
  
  // Shuffle array helper
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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

  // Render question based on type
  const renderQuestion = () => {
    switch (currentCard?.type) {
      case 'multiple-choice':
      case 'single-choice':
        return (
          <View className="mt-4">
            {shuffleArray(currentCard.options || []).map((option, index) => (
              <TouchableOpacity
                key={index}
                className={`p-4 rounded-xl mb-3 ${
                  selectedAnswers.includes(option)
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-gray-100'
                }`}
                onPress={() => toggleAnswerSelection(option)}
              >
                <Text className="text-gray-800">{option}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              className={`mt-6 py-3 rounded-xl items-center ${
                selectedAnswers.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              disabled={selectedAnswers.length === 0}
              onPress={() => {
                // In a real app, check answer correctness here
                console.log('Selected answers:', selectedAnswers);
                // For now, just show the back of the card
                flipCard();
              }}
            >
              <Text className="text-white font-bold">Check Answer</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'true-false':
        return (
          <View className="flex-row justify-center mt-6">
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-4 px-8 mx-2"
              onPress={() => {
                // In a real app, check if false is correct
                console.log('Selected: False');
                flipCard();
              }}
            >
              <Text className="text-white font-bold text-lg">False</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="bg-green-500 rounded-xl py-4 px-8 mx-2"
              onPress={() => {
                // In a real app, check if true is correct
                console.log('Selected: True');
                flipCard();
              }}
            >
              <Text className="text-white font-bold text-lg">True</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'fill-blank':
        return (
          <View className="mt-4">
            <View className="bg-gray-100 rounded-xl p-4">
              <Text className="text-gray-800 text-center">
                {currentCard.front.replace('_________', '_____')}
              </Text>
            </View>
            
            <View className="mt-4">
              <Text className="text-gray-700 font-medium mb-2">Your Answer:</Text>
              <View className="bg-white border border-gray-300 rounded-xl p-4">
                <Text className="text-gray-800 text-center">
                  {currentCard.answer || 'Your answer will appear here'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              className="mt-6 bg-indigo-600 rounded-xl py-3 items-center"
              onPress={flipCard}
            >
              <Text className="text-white font-bold">Show Answer</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'matching':
        const shuffledRights = shuffleArray(
          (currentCard.pairs || []).map(p => p.right)
        );
        
        return (
          <View className="mt-4">
            {(currentCard.pairs || []).map((pair, leftIndex) => (
              <View key={leftIndex} className="mb-4">
                <View className="flex-row items-center justify-between bg-white rounded-xl p-3 mb-2">
                  <Text className="text-gray-800 font-medium">{pair.left}</Text>
                  <Text className="text-gray-500">→</Text>
                  <View className="bg-indigo-100 rounded-lg px-4 py-2 min-w-[100px] items-center">
                    <Text className="text-indigo-800">
                      {matchedPairs[pair.left] || 'Select...'}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row flex-wrap gap-2">
                  {shuffledRights.map((right, rightIndex) => (
                    <TouchableOpacity
                      key={rightIndex}
                      className={`px-3 py-2 rounded-lg ${
                        matchedPairs[pair.left] === right
                          ? 'bg-indigo-500'
                          : 'bg-gray-200'
                      }`}
                      onPress={() => selectMatchingPair(pair.left, right)}
                    >
                      <Text
                        className={
                          matchedPairs[pair.left] === right
                            ? 'text-white'
                            : 'text-gray-800'
                        }
                      >
                        {right}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            
            <TouchableOpacity
              className="mt-6 bg-indigo-600 rounded-xl py-3 items-center"
              onPress={flipCard}
            >
              <Text className="text-white font-bold">Check Matches</Text>
            </TouchableOpacity>
          </View>
        );
        
      default:
        return null;
    }
  };

  if (!currentCard) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Text className="text-gray-700 text-lg text-center">
          {mode === 'learn'
            ? 'No new cards to learn!'
            : mode === 'review'
            ? 'No cards due for review!'
            : 'No cards available for practice!'}
        </Text>
        
        <TouchableOpacity
          className="mt-6 bg-indigo-600 rounded-xl py-3 px-6"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            className="p-2 -ml-2"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-gray-800 capitalize">
            {mode} Mode
          </Text>
          
          <View className="flex-row">
            <TouchableOpacity 
              className="p-2"
              onPress={toggleHint}
            >
              <Lightbulb size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="mt-3 flex-row items-center">
          <View className="flex-1 bg-gray-200 rounded-full h-2">
            <View 
              className="bg-indigo-500 h-2 rounded-full" 
              style={{ width: `${((currentCardIndex + 1) / filteredCards.length) * 100}%` }}
            />
          </View>
          <Text className="text-gray-600 text-sm ml-2">
            {currentCardIndex + 1}/{filteredCards.length}
          </Text>
        </View>
        
        <View className="mt-2 flex-row justify-between">
          <Text className="text-gray-600 text-sm">
            Correct: {sessionStats.correct}/{sessionStats.total}
          </Text>
          <Text className="text-gray-600 text-sm capitalize">
            {currentCard.type.replace('-', ' ')}
          </Text>
        </View>
      </View>
      
      {/* Flashcard */}
      <ScrollView className="flex-1 px-6 py-4">
        {!isFlipped ? (
          // Front of card
          <TouchableOpacity 
            className="bg-white rounded-2xl shadow-lg p-6"
            onPress={flipCard}
            activeOpacity={0.9}
          >
            <Text className="text-gray-800 text-xl text-center">
              {currentCard.front}
            </Text>
            
            {showHint && (
              <View className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <Text className="text-yellow-800 text-sm">
                  Hint: Think about the fundamental principles involved.
                </Text>
              </View>
            )}
            
            {currentCard.type !== 'multiple-choice' && 
             currentCard.type !== 'single-choice' &&
             currentCard.type !== 'true-false' && (
              <Text className="text-gray-400 text-sm mt-4 text-center">
                Tap to reveal answer
              </Text>
            )}
            
            {renderQuestion()}
          </TouchableOpacity>
        ) : (
          // Back of card
          <View className="bg-indigo-50 rounded-2xl shadow-lg p-6">
            <Text className="text-indigo-800 text-xl text-center font-medium">
              {currentCard.back}
            </Text>
            
            {showHint && (
              <View className="mt-4 p-3 bg-yellow-100 rounded-lg">
                <Text className="text-yellow-800 text-sm">
                  Additional explanation: This concept relates to fundamental computer science principles.
                </Text>
              </View>
            )}
            
            <Text className="text-indigo-400 text-sm mt-4 text-center">
              How well did you know this?
            </Text>
            
            {/* SRS Rating Buttons */}
            <View className="mt-6">
              <View className="flex-row justify-between mb-3">
                <TouchableOpacity 
                  className="bg-red-500 rounded-xl py-3 px-2 flex-1 items-center mx-1"
                  onPress={() => handleRating('again')}
                >
                  <Text className="text-white font-bold">Again</Text>
                  <Text className="text-white text-xs mt-1">1m</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-orange-500 rounded-xl py-3 px-2 flex-1 items-center mx-1"
                  onPress={() => handleRating('hard')}
                >
                  <Text className="text-white font-bold">Hard</Text>
                  <Text className="text-white text-xs mt-1">6m</Text>
                </TouchableOpacity>
              </View>
              
              <View className="flex-row justify-between">
                <TouchableOpacity 
                  className="bg-green-500 rounded-xl py-3 px-2 flex-1 items-center mx-1"
                  onPress={() => handleRating('good')}
                >
                  <Text className="text-white font-bold">Good</Text>
                  <Text className="text-white text-xs mt-1">1d</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-blue-500 rounded-xl py-3 px-2 flex-1 items-center mx-1"
                  onPress={() => handleRating('easy')}
                >
                  <Text className="text-white font-bold">Easy</Text>
                  <Text className="text-white text-xs mt-1">3d</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity
              className="mt-4 flex-row items-center justify-center"
              onPress={() => {
                setIsFlipped(false);
                setShowHint(false);
              }}
            >
              <RotateCcw size={16} color="#4F46E5" />
              <Text className="text-indigo-600 font-medium ml-2">See Question Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backfaceVisibility: 'hidden',
  }
});

export default ReviewCardsScreen;