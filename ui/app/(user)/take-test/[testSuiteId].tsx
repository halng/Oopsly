import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from "lucide-react-native";
import { useQuestions } from "@/hooks/queries/useQuestions";
import { Question } from "@/types/Question";

export default function TakeTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testSuiteId: string }>();
  const testSuiteId = params.testSuiteId as string;

  const { data: questions, isLoading } = useQuestions(testSuiteId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Loading test...</Text>
      </View>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-4">
        <Text className="text-xl font-bold text-gray-800 mb-2">No questions found</Text>
        <Text className="text-gray-500 text-center mb-6">
          This test suite doesn't have any questions yet. Add questions via the Manage Test screen.
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion: Question = questions[currentIndex];
  const userAnswer = userAnswers[currentQuestion.id];

  const handleSelectOption = (index: number) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setIsSubmitted(false);
  };

  const renderResults = () => {
    let score = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionIndex) {
        score += 1;
      }
    });
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <ScrollView className="flex-1 px-4 py-8 bg-gray-50">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-800 mb-2">Test Complete!</Text>
          <View className="bg-white rounded-xl p-6 shadow-sm w-full mt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-lg text-gray-600">Your Score</Text>
              <Text className="text-2xl font-bold text-indigo-600">{percentage}%</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Correct Answers</Text>
              <Text className="font-bold text-gray-800">{score} / {questions.length}</Text>
            </View>
          </View>
        </View>

        <Text className="text-xl font-bold text-gray-800 mb-4">Review Answers</Text>
        {questions.map((q, idx) => {
          const uAns = userAnswers[q.id];
          const isCorrect = uAns === q.correctOptionIndex;
          
          return (
            <View
              key={q.id}
              className={`p-4 rounded-xl border mb-4 ${
                isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <View className="flex-row items-start mb-3">
                <Text className="font-bold text-gray-800 mr-2">{idx + 1}.</Text>
                <Text className="flex-1 text-gray-800 font-medium">{q.content}</Text>
              </View>
              
              <View className="mb-2 pl-6">
                <Text className="text-sm text-gray-600">
                  Your Answer: <Text className="font-semibold">{uAns !== undefined ? q.options[uAns] : "Not answered"}</Text>
                </Text>
                <Text className="text-sm text-gray-600">
                  Correct Answer: <Text className="font-semibold">{q.options[q.correctOptionIndex]}</Text>
                </Text>
              </View>

              <View className="flex-row items-center mt-2 pt-2 border-t border-gray-200">
                {isCorrect ? (
                  <>
                    <CheckCircle size={16} color="#10B981" />
                    <Text className="text-green-600 ml-1 font-medium">Correct</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={16} color="#EF4444" />
                    <Text className="text-red-600 ml-1 font-medium">Incorrect</Text>
                  </>
                )}
              </View>
            </View>
          );
        })}

        <View className="flex-row gap-3 mt-4 mb-12">
          <TouchableOpacity
            className="flex-1 py-4 bg-white border border-gray-300 rounded-xl items-center"
            onPress={() => router.push("/home")}
          >
            <Text className="font-bold text-gray-800">Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-4 bg-indigo-600 rounded-xl items-center flex-row justify-center"
            onPress={handleRetake}
          >
            <RotateCcw size={18} color="white" />
            <Text className="font-bold text-white ml-2">Retake Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if (isSubmitted) {
    return renderResults();
  }

  const allAnswered = Object.keys(userAnswers).length === questions.length;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Test Session</Text>
          <View style={{ width: 40 }} />
        </View>
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-200 rounded-full h-2">
            <View
              className="bg-indigo-500 h-2 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </View>
          <Text className="text-gray-600 text-sm ml-3 font-medium">
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-6 leading-8">
            {currentQuestion.content}
          </Text>

          <View className="gap-3">
            {currentQuestion.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                className={`p-4 rounded-xl border-2 flex-row items-center ${
                  userAnswer === idx
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white"
                }`}
                onPress={() => handleSelectOption(idx)}
              >
                <View
                  className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                    userAnswer === idx ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                  }`}
                >
                  {userAnswer === idx && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
                <Text className={`flex-1 text-base ${userAnswer === idx ? "text-indigo-900 font-medium" : "text-gray-700"}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-row justify-between mb-8">
          <TouchableOpacity
            className={`py-4 px-6 rounded-xl items-center ${
              currentIndex > 0 ? "bg-white border border-gray-300" : "bg-gray-100 opacity-50"
            }`}
            onPress={handlePrev}
            disabled={currentIndex === 0}
          >
            <Text className={currentIndex > 0 ? "font-bold text-gray-800" : "font-bold text-gray-400"}>
              Previous
            </Text>
          </TouchableOpacity>
          
          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity
              className="py-4 px-8 bg-indigo-600 rounded-xl items-center shadow-sm"
              onPress={handleNext}
            >
              <Text className="font-bold text-white text-base">Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`py-4 px-6 rounded-xl items-center shadow-sm ${
                allAnswered ? "bg-green-600" : "bg-gray-300"
              }`}
              onPress={handleSubmit}
              disabled={!allAnswered}
            >
              <Text className={`font-bold text-base ${allAnswered ? "text-white" : "text-gray-500"}`}>
                Submit Test
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
