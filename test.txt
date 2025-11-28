import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { ChevronLeft, RotateCcw, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Define question types
type QuestionType = 'multiple-choice' | 'single-choice' | 'fill-in-blank';

interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  imageUrl?: string;
}

// Mock test data
const mockTestQuestions: Question[] = [
  {
    id: '1',
    type: 'multiple-choice',
    prompt: 'Which of the following are programming languages?',
    options: ['JavaScript', 'Banana', 'Python', 'HTML', 'CSS'],
    correctAnswer: ['JavaScript', 'Python', 'HTML', 'CSS']
  },
  {
    id: '2',
    type: 'single-choice',
    prompt: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 'Paris'
  },
  {
    id: '3',
    type: 'fill-in-blank',
    prompt: 'The chemical symbol for gold is ______.',
    correctAnswer: 'Au'
  },
  {
    id: '4',
    type: 'multiple-choice',
    prompt: 'Select all valid CSS units:',
    options: ['px', 'em', 'kg', 'rem', 'lb'],
    correctAnswer: ['px', 'em', 'rem']
  }
];

export default function TestSessionScreen() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fillInAnswer, setFillInAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const currentQuestion = mockTestQuestions[currentQuestionIndex];
  
  // Handle option selection for multiple/single choice
  const handleOptionToggle = (option: string) => {
    if (currentQuestion.type === 'single-choice') {
      setSelectedOptions([option]);
      return;
    }
    
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(item => item !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };
  
  // Check if an option is selected
  const isOptionSelected = (option: string) => {
    return selectedOptions.includes(option);
  };
  
  // Check if the answer is correct
  const isAnswerCorrect = () => {
    if (currentQuestion.type === 'fill-in-blank') {
      return fillInAnswer.trim().toLowerCase() === (currentQuestion.correctAnswer as string).toLowerCase();
    }
    
    if (Array.isArray(currentQuestion.correctAnswer)) {
      // For multiple choice, check if arrays match
      const sortedSelected = [...selectedOptions].sort();
      const sortedCorrect = [...currentQuestion.correctAnswer].sort();
      return JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    }
    
    // For single choice
    return selectedOptions[0] === currentQuestion.correctAnswer;
  };
  
  // Submit current answer
  const handleSubmit = () => {
    setIsSubmitted(true);
  };
  
  // Move to next question
  const handleNext = () => {
    if (currentQuestionIndex < mockTestQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
    } else {
      // End of test - in a real app, we'd show results
      router.back();
    }
  };
  
  // Reset state for new question
  const resetQuestionState = () => {
    setSelectedOptions([]);
    setFillInAnswer('');
    setIsSubmitted(false);
  };
  
  // Get button text based on current state
  const getNextButtonText = () => {
    if (currentQuestionIndex === mockTestQuestions.length - 1) {
      return 'Finish Test';
    }
    return 'Next Question';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-4 pt-6 pb-4 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="flex-row items-center"
        >
          <ChevronLeft color="#3B82F6" size={24} />
          <Text className="ml-2 text-blue-500 font-medium">Exit Test</Text>
        </TouchableOpacity>
        
        <Text className="text-gray-500 dark:text-gray-400">
          {currentQuestionIndex + 1}/{mockTestQuestions.length}
        </Text>
        
        <TouchableOpacity className="flex-row items-center">
          <RotateCcw color="#3B82F6" size={20} />
          <Text className="ml-1 text-blue-500 font-medium">Restart</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 bg-gray-200 dark:bg-gray-800 mx-4 rounded-full mb-6">
        <View 
          className="h-full bg-blue-500 rounded-full" 
          style={{ width: `${((currentQuestionIndex + 1) / mockTestQuestions.length) * 100}%` }}
        />
      </View>

      {/* Question Area */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Question {currentQuestionIndex + 1}
          </Text>
          
          <Text className="text-xl text-gray-800 dark:text-gray-100 mb-6">
            {currentQuestion.prompt}
          </Text>
          
          {/* Different UI for each question type */}
          {currentQuestion.type === 'fill-in-blank' ? (
            <View className="mt-4">
              <TextInput
                className={`border-b-2 py-2 text-lg ${isSubmitted ? 
                  (isAnswerCorrect() ? 'border-green-500' : 'border-red-500') : 
                  'border-gray-300 dark:border-gray-600'}`}
                placeholder="Type your answer here..."
                value={fillInAnswer}
                onChangeText={setFillInAnswer}
                editable={!isSubmitted}
                placeholderTextColor="#9CA3AF"
              />
              
              {isSubmitted && !isAnswerCorrect() && (
                <Text className="text-red-500 mt-2">
                  Correct answer: {currentQuestion.correctAnswer}
                </Text>
              )}
            </View>
          ) : (
            <View className="mt-2">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = isOptionSelected(option);
                const isCorrect = Array.isArray(currentQuestion.correctAnswer) 
                  ? currentQuestion.correctAnswer.includes(option)
                  : currentQuestion.correctAnswer === option;
                
                return (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center p-4 rounded-xl mb-3 ${
                      isSubmitted
                        ? isSelected && isCorrect
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                          : isSelected && !isCorrect
                            ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                            : isCorrect
                              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                              : 'bg-gray-100 dark:bg-gray-700/50'
                        : isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                          : 'bg-gray-100 dark:bg-gray-700/50'
                    }`}
                    onPress={() => !isSubmitted && handleOptionToggle(option)}
                    disabled={isSubmitted}
                  >
                    <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                      isSubmitted
                        ? isSelected && isCorrect
                          ? 'border-green-500 bg-green-500'
                          : isSelected && !isCorrect
                            ? 'border-red-500 bg-red-500'
                            : isCorrect
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-400'
                        : isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400'
                    }`}>
                      {(isSubmitted && isCorrect) || (isSubmitted && isSelected) || isSelected ? (
                        <Check size={16} color="white" />
                      ) : null}
                    </View>
                    <Text className={`text-base ${
                      isSubmitted
                        ? isSelected && isCorrect
                          ? 'text-green-700 dark:text-green-300'
                          : isSelected && !isCorrect
                            ? 'text-red-700 dark:text-red-300'
                            : isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-gray-700 dark:text-gray-300'
                        : isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        
        {/* Feedback and Navigation */}
        <View className="mb-8">
          {!isSubmitted ? (
            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${
                (currentQuestion.type === 'fill-in-blank' && fillInAnswer.trim() !== '') ||
                (currentQuestion.type !== 'fill-in-blank' && selectedOptions.length > 0)
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
              onPress={handleSubmit}
              disabled={
                (currentQuestion.type === 'fill-in-blank' && fillInAnswer.trim() === '') ||
                (currentQuestion.type !== 'fill-in-blank' && selectedOptions.length === 0)
              }
            >
              <Text className="text-white font-bold text-lg">Submit Answer</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View className={`p-4 rounded-xl mb-4 ${
                isAnswerCorrect() 
                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
                  : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
              }`}>
                <Text className={`font-bold text-center ${
                  isAnswerCorrect() ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {isAnswerCorrect() ? 'Correct!' : 'Incorrect'}
                </Text>
                {!isAnswerCorrect() && (
                  <Text className="text-center mt-1 text-gray-700 dark:text-gray-300">
                    {currentQuestion.type === 'fill-in-blank'
                      ? `The correct answer is: ${(currentQuestion.correctAnswer as string)}`
                      : 'Please review the correct answers above'}
                  </Text>
                )}
              </View>
              
              <TouchableOpacity
                className="py-4 bg-blue-500 rounded-xl items-center"
                onPress={handleNext}
              >
                <Text className="text-white font-bold text-lg">{getNextButtonText()}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}