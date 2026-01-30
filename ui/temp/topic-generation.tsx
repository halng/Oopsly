import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Lightbulb,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";

const TopicGenerationScreen = () => {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [subjectName, setSubjectName] = useState("");
  const [cardCount, setCardCount] = useState(10);

  // Mock processing function
  const handleGenerateFromTopic = () => {
    if (!topic.trim()) {
      Alert.alert("Topic Required", "Please enter a topic to generate cards");
      return;
    }

    if (!subjectName.trim()) {
      Alert.alert("Subject Name Required", "Please enter a subject name");
      return;
    }

    setIsProcessing(true);
    setProcessingStep(0);

    // Simulate processing steps
    const steps = [
      "Analyzing topic keywords...",
      "Researching relevant information...",
      "Generating flashcards...",
      "Optimizing for learning...",
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setProcessingStep(stepIndex);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          router.push("/subject/new");
        }, 500);
      }
    }, 1500);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            Generate from Topic
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {!isProcessing ? (
          <>
            {/* Topic Input Section */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
                  <Lightbulb size={32} color="#10B981" />
                </View>
                <Text className="text-lg font-bold text-gray-800 mb-2">
                  Generate from Topic
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  Enter any topic and our AI will create smart flashcards for your learning
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Topic</Text>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="e.g., Photosynthesis process, World War II events..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 h-24"
                />
              </View>

              <View className="bg-emerald-50 rounded-lg p-4">
                <View className="flex-row items-center mb-2">
                  <Lightbulb size={16} color="#10B981" />
                  <Text className="font-bold text-emerald-800 ml-2">
                    Pro Tip
                  </Text>
                </View>
                <Text className="text-emerald-700 text-sm">
                  Be specific with your topics for better results. For example: 
                  "Cellular respiration in plant cells" instead of "Biology".
                </Text>
              </View>
            </View>

            {/* Subject Details */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-4">
                Subject Details
              </Text>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2">Subject Name</Text>
                <TextInput
                  value={subjectName}
                  onChangeText={setSubjectName}
                  placeholder="e.g., Biology - Photosynthesis"
                  className="border border-gray-300 rounded-lg p-4 text-gray-800"
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2">Number of Cards</Text>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => cardCount > 1 && setCardCount(cardCount - 1)}
                    className="bg-gray-100 w-10 h-10 rounded-lg items-center justify-center"
                  >
                    <Text className="text-gray-700 text-xl">-</Text>
                  </TouchableOpacity>
                  <View className="mx-4">
                    <Text className="text-xl font-bold text-gray-800">
                      {cardCount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => cardCount < 50 && setCardCount(cardCount + 1)}
                    className="bg-gray-100 w-10 h-10 rounded-lg items-center justify-center"
                  >
                    <Text className="text-gray-700 text-xl">+</Text>
                  </TouchableOpacity>
                  <Text className="ml-4 text-gray-500">cards</Text>
                </View>
              </View>
            </View>

            {/* AI Processing Info */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <View className="flex-row items-center mb-3">
                <Sparkles size={20} color="#8B5CF6" />
                <Text className="text-lg font-bold text-gray-800 ml-2">
                  AI Generation
                </Text>
              </View>
              <Text className="text-gray-600 mb-3">
                Our AI will research your topic and automatically generate
                flashcards optimized for your learning.
              </Text>
              <View className="bg-purple-50 rounded-lg p-4">
                <Text className="text-purple-800 font-medium mb-2">
                  What to expect:
                </Text>
                <Text className="text-purple-700 text-sm">
                • Comprehensive topic research
                </Text>
                <Text className="text-purple-700 text-sm">
                • Smart flashcard generation
                </Text>
                <Text className="text-purple-700 text-sm">
                • Adaptive difficulty settings
                </Text>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              onPress={handleGenerateFromTopic}
              className={`py-4 rounded-xl items-center ${
                topic.trim() && subjectName.trim()
                  ? "bg-emerald-600"
                  : "bg-gray-300"
              }`}
            >
              <Text
                className={`font-bold ${
                  topic.trim() && subjectName.trim() 
                    ? "text-white" 
                    : "text-gray-500"
                }`}
              >
                Generate Flashcards
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Processing View */
          <View className="flex-1 items-center justify-center py-12">
            <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-8">
              <Sparkles size={48} color="#10B981" />
            </View>

            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Generating Content
            </Text>
            <Text className="text-gray-500 mb-10 text-center">
              Our AI is researching "{topic}" and creating flashcards
            </Text>

            <View className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <View
                className="bg-emerald-600 h-3 rounded-full"
                style={{
                  width: `${((processingStep + 1) / 4) * 100}%`,
                }}
              />
            </View>
            <Text className="text-gray-500 text-sm mb-10">
              {Math.round(((processingStep + 1) / 4) * 100)}% Complete
            </Text>

            <View className="w-full bg-white rounded-xl p-6 shadow-sm">
              <Text className="font-bold text-gray-800 mb-4">
                Current Step:
              </Text>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-emerald-600 mr-3" />
                <Text className="text-gray-700">
                  {[
                    "Analyzing topic keywords...",
                    "Researching relevant information...",
                    "Generating flashcards...",
                    "Optimizing for learning...",
                  ][processingStep]}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TopicGenerationScreen;