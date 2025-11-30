import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  BarChart2,
  RotateCcw,
} from "lucide-react-native";

// Mock test data
const mockTest = {
  id: "1",
  title: "Biology Midterm Exam",
  topic: "Cellular Biology",
  duration: 30, // minutes
  questions: [
    {
      id: "1",
      question: "What is the powerhouse of the cell?",
      options: [
        "Nucleus",
        "Mitochondria",
        "Ribosome",
        "Endoplasmic Reticulum",
      ],
      correctAnswer: 1,
      type: "multiple-choice",
    },
    {
      id: "2",
      question: "Photosynthesis occurs in the chloroplasts.",
      correctAnswer: true,
      type: "true-false",
    },
    {
      id: "3",
      question: "What is the function of the cell membrane?",
      type: "short-answer",
    },
    {
      id: "4",
      question: "Which organelle is responsible for protein synthesis?",
      options: [
        "Golgi Apparatus",
        "Lysosome",
        "Ribosome",
        "Vacuole",
      ],
      correctAnswer: 2,
      type: "multiple-choice",
    },
    {
      id: "5",
      question: "The nucleus contains DNA.",
      correctAnswer: true,
      type: "true-false",
    },
  ],
};

const TestTakingScreen = () => {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(mockTest.duration * 60); // in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(new Date());

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0 || isSubmitted) {
      if (!isSubmitted) handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitted]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle answer selection
  const handleAnswerSelect = (answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }));
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < mockTest.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit test
  const handleSubmitTest = () => {
    setIsSubmitted(true);
    setShowResults(true);
  };

  // Calculate score
  const calculateScore = () => {
    let correct = 0;
    mockTest.questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer !== undefined) {
        if (question.type === "true-false" || question.type === "multiple-choice") {
          if (userAnswer === question.correctAnswer) {
            correct++;
          }
        }
        // For short answer, we'll count it as correct for demo purposes
        if (question.type === "short-answer") {
          correct++;
        }
      }
    });
    return {
      correct,
      total: mockTest.questions.length,
      percentage: Math.round((correct / mockTest.questions.length) * 100),
    };
  };

  const currentQuestion = mockTest.questions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];
  const score = calculateScore();

  // Render question based on type
  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case "multiple-choice":
        return (
          <View className="gap-3">
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                className={`p-4 rounded-xl border ${
                  userAnswer === index
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
                onPress={() => handleAnswerSelect(index)}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                      userAnswer === index
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {userAnswer === index && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text className="text-gray-800">{option}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      case "true-false":
        return (
          <View className="flex-row gap-4">
            <TouchableOpacity
              className={`flex-1 p-6 rounded-xl border items-center ${
                userAnswer === true
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
              onPress={() => handleAnswerSelect(true)}
            >
              <Text className="text-2xl font-bold text-green-600 mb-2">✓</Text>
              <Text className="text-lg font-medium text-gray-800">True</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 p-6 rounded-xl border items-center ${
                userAnswer === false
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
              onPress={() => handleAnswerSelect(false)}
            >
              <Text className="text-2xl font-bold text-red-600 mb-2">✗</Text>
              <Text className="text-lg font-medium text-gray-800">False</Text>
            </TouchableOpacity>
          </View>
        );
      case "short-answer":
        return (
          <View className="bg-white rounded-xl border border-gray-200 p-4">
            <TextInput
              value={userAnswer}
              onChangeText={handleAnswerSelect}
              placeholder="Type your answer here..."
              multiline
              className="text-gray-800 h-32 text-base"
              textAlignVertical="top"
            />
          </View>
        );
      default:
        return null;
    }
  };

  // Render results summary
  const renderResults = () => {
    return (
      <ScrollView className="flex-1 px-4 py-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-4">
            <BarChart2 size={48} color="#3B82F6" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            Test Completed!
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            You've finished the {mockTest.title}
          </Text>
          
          <View className="bg-white rounded-xl p-6 w-full shadow-sm mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-800">Your Score</Text>
              <Text className="text-2xl font-bold text-blue-600">
                {score.percentage}%
              </Text>
            </View>
            
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Correct Answers</Text>
              <Text className="font-medium text-gray-800">
                {score.correct}/{score.total}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Time Taken</Text>
              <Text className="font-medium text-gray-800">
                {mockTest.duration - Math.floor(timeRemaining / 60)} min
              </Text>
            </View>
          </View>
        </View>
        
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Question Review
          </Text>
          <View className="gap-4">
            {mockTest.questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = 
                question.type === "short-answer" || 
                (userAnswer !== undefined && userAnswer === question.correctAnswer);
              
              return (
                <View 
                  key={question.id} 
                  className={`p-4 rounded-xl border ${
                    isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <View className="flex-row items-start mb-2">
                    <Text className="font-bold text-gray-800 mr-2">
                      {index + 1}.
                    </Text>
                    <Text className="flex-1 text-gray-800">
                      {question.question}
                    </Text>
                  </View>
                  
                  {question.type === "multiple-choice" && (
                    <View className="mt-2">
                      <Text className="text-sm text-gray-600 mb-1">
                        Your answer: {question.options[userAnswer] || "Not answered"}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Correct answer: {question.options[question.correctAnswer]}
                      </Text>
                    </View>
                  )}
                  
                  {question.type === "true-false" && (
                    <View className="mt-2">
                      <Text className="text-sm text-gray-600 mb-1">
                        Your answer: {userAnswer === true ? "True" : userAnswer === false ? "False" : "Not answered"}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Correct answer: {question.correctAnswer === true ? "True" : "False"}
                      </Text>
                    </View>
                  )}
                  
                  {question.type === "short-answer" && (
                    <View className="mt-2">
                      <Text className="text-sm text-gray-600">
                        Your answer: {userAnswer || "Not answered"}
                      </Text>
                    </View>
                  )}
                  
                  <View className="flex-row items-center mt-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle size={16} color="#10B981" />
                        <Text className="text-green-600 ml-1 text-sm">Correct</Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} color="#EF4444" />
                        <Text className="text-red-600 ml-1 text-sm">Incorrect</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 py-4 bg-white border border-gray-300 rounded-xl items-center"
            onPress={() => router.push("/")}
          >
            <Text className="font-bold text-gray-800">Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-4 bg-blue-600 rounded-xl items-center flex-row justify-center"
            onPress={() => {
              setCurrentQuestionIndex(0);
              setUserAnswers({});
              setTimeRemaining(mockTest.duration * 60);
              setIsSubmitted(false);
              setShowResults(false);
            }}
          >
            <RotateCcw size={18} color="white" />
            <Text className="font-bold text-white ml-2">Retake Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-2 -ml-2"
            >
              <ArrowLeft size={24} color="#4B5563" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">
              {mockTest.title}
            </Text>
          </View>
          
          <View className="flex-row items-center bg-red-50 px-3 py-1 rounded-full">
            <Clock size={16} color="#EF4444" />
            <Text className="ml-1 font-bold text-red-700">
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>
        
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-200 rounded-full h-2">
            <View
              className="bg-blue-500 h-2 rounded-full"
              style={{
                width: `${((currentQuestionIndex + 1) / mockTest.questions.length) * 100}%`,
              }}
            />
          </View>
          <Text className="text-gray-600 text-sm ml-2">
            {currentQuestionIndex + 1}/{mockTest.questions.length}
          </Text>
        </View>
      </View>

      {showResults ? (
        renderResults()
      ) : (
        <ScrollView className="flex-1 px-4 py-6">
          <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <View className="flex-row items-start mb-4">
              <Text className="text-lg font-bold text-gray-800 mr-2">
                {currentQuestionIndex + 1}.
              </Text>
              <Text className="flex-1 text-lg font-bold text-gray-800">
                {currentQuestion.question}
              </Text>
            </View>
            
            {renderQuestion()}
          </View>
          
          <View className="flex-row justify-between">
            <TouchableOpacity
              className={`py-4 px-6 rounded-xl items-center ${
                currentQuestionIndex > 0
                  ? "bg-gray-200"
                  : "bg-gray-100 opacity-50"
              }`}
              onPress={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <Text
                className={
                  currentQuestionIndex > 0
                    ? "font-bold text-gray-800"
                    : "font-bold text-gray-400"
                }
              >
                Previous
              </Text>
            </TouchableOpacity>
            
            {currentQuestionIndex < mockTest.questions.length - 1 ? (
              <TouchableOpacity
                className="py-4 px-6 bg-blue-600 rounded-xl items-center"
                onPress={goToNextQuestion}
              >
                <Text className="font-bold text-white">Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`py-4 px-6 rounded-xl items-center ${
                  Object.keys(userAnswers).length === mockTest.questions.length
                    ? "bg-green-600"
                    : "bg-gray-300"
                }`}
                onPress={handleSubmitTest}
                disabled={Object.keys(userAnswers).length !== mockTest.questions.length}
              >
                <Text
                  className={
                    Object.keys(userAnswers).length === mockTest.questions.length
                      ? "font-bold text-white"
                      : "font-bold text-gray-500"
                  }
                >
                  Submit Test
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default TestTakingScreen;