import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  FileText,
  Lightbulb,
  Brain,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Clock,
  Users,
  Trophy,
  Timer,
  Tag,
  Edit3,
} from "lucide-react-native";

const TestGenerationScreen = () => {
  const router = useRouter();
  const [testTitle, setTestTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  // Advanced customization options
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");

  // Available categories for selection
  const categories = [
    "Science",
    "Mathematics",
    "History",
    "Literature",
    "Geography",
    "Art",
    "Technology",
    "Languages",
  ];

  // Mock processing function
  const handleGenerateTest = () => {
    if (!testTitle.trim()) {
      Alert.alert("Test Title Required", "Please enter a title for your test");
      return;
    }

    if (!topic.trim()) {
      Alert.alert("Topic Required", "Please enter a topic for your test");
      return;
    }

    setIsProcessing(true);
    setProcessingStep(0);

    // Simulate processing steps
    const steps = [
      "Analyzing topic keywords...",
      "Researching relevant information...",
      "Generating questions...",
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
          Alert.alert(
            "Test Generated Successfully!",
            `Your "${testTitle}" test is ready to use.`,
            [
              {
                text: "Take Test Now",
                onPress: () => router.push("/study/new"),
              },
              {
                text: "View Later",
                onPress: () => router.push("/"),
                style: "cancel",
              },
            ]
          );
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
          <Text className="text-xl font-bold text-gray-800">Generate Test</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {!isProcessing ? (
          <>
            {/* Test Info Section */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
                  <Trophy size={32} color="#3B82F6" />
                </View>
                <Text className="text-lg font-bold text-gray-800 mb-2">
                  Create Custom Test
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  Generate a personalized test based on any topic to assess your
                  knowledge
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">
                  Test Title
                </Text>
                <TextInput
                  value={testTitle}
                  onChangeText={setTestTitle}
                  placeholder="e.g., Biology Midterm, History Quiz..."
                  className="border border-gray-300 rounded-lg p-4 text-gray-800"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Topic</Text>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="e.g., Cellular respiration, World War II..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 h-24"
                />
              </View>

              <View className="bg-blue-50 rounded-lg p-4">
                <View className="flex-row items-center mb-2">
                  <Lightbulb size={16} color="#3B82F6" />
                  <Text className="font-bold text-blue-800 ml-2">Pro Tip</Text>
                </View>
                <Text className="text-blue-700 text-sm">
                  Be specific with your topics for better results. For example:
                  "Photosynthesis process in plants" instead of "Biology".
                </Text>
              </View>
            </View>

            {/* Test Configuration */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-4">
                Test Configuration
              </Text>

              <View className="mb-6">
                <Text className="text-gray-700 mb-3 font-medium">
                  Number of Questions
                </Text>
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={() =>
                      questionCount > 1 && setQuestionCount(questionCount - 1)
                    }
                    className="bg-gray-100 w-12 h-12 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-700 text-2xl font-bold">-</Text>
                  </TouchableOpacity>

                  <View className="items-center">
                    <Text className="text-3xl font-bold text-gray-800">
                      {questionCount}
                    </Text>
                    <Text className="text-gray-500 text-sm">questions</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      questionCount < 50 && setQuestionCount(questionCount + 1)
                    }
                    className="bg-gray-100 w-12 h-12 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-700 text-2xl font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-3 font-medium">
                  Difficulty Level
                </Text>
                <View className="flex-row gap-3">
                  {[
                    { label: "Easy", value: "easy", color: "bg-green-500" },
                    {
                      label: "Medium",
                      value: "medium",
                      color: "bg-yellow-500",
                    },
                    { label: "Hard", value: "hard", color: "bg-red-500" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setDifficulty(item.value)}
                      className={`flex-1 py-3 rounded-lg items-center ${
                        difficulty === item.value
                          ? `${item.color} shadow-sm`
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={
                          difficulty === item.value
                            ? "text-white font-bold"
                            : "text-gray-700"
                        }
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Advanced Customization */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-4">
                Advanced Customization
              </Text>

              {/* Time Limit */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Timer size={20} color="#4B5563" className="mr-2" />
                    <Text className="text-gray-700 font-medium">
                      Time Limit
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: "#D1D5DB", true: "#8BC34A" }}
                    thumbColor={timeLimitEnabled ? "#FFFFFF" : "#F4F4F5"}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={setTimeLimitEnabled}
                    value={timeLimitEnabled}
                  />
                </View>

                {timeLimitEnabled && (
                  <View className="bg-gray-50 rounded-lg p-4">
                    <Text className="text-gray-700 mb-2">
                      Minutes per question
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() =>
                          timeLimit > 1 && setTimeLimit(timeLimit - 1)
                        }
                        className="bg-gray-200 w-10 h-10 rounded-full items-center justify-center"
                        disabled={!timeLimitEnabled}
                      >
                        <Text className="text-gray-700 text-xl font-bold">
                          -
                        </Text>
                      </TouchableOpacity>

                      <Text className="text-xl font-bold text-gray-800 mx-4">
                        {timeLimit}
                      </Text>

                      <TouchableOpacity
                        onPress={() =>
                          timeLimit < 120 && setTimeLimit(timeLimit + 1)
                        }
                        className="bg-gray-200 w-10 h-10 rounded-full items-center justify-center"
                        disabled={!timeLimitEnabled}
                      >
                        <Text className="text-gray-700 text-xl font-bold">
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-gray-500 text-sm mt-2 text-center">
                      Total estimated time: {questionCount * timeLimit} minutes
                    </Text>
                  </View>
                )}
              </View>

              {/* Question Categories */}
              <View className="mb-6">
                <View className="flex-row items-center mb-3">
                  <Tag size={20} color="#4B5563" className="mr-2" />
                  <Text className="text-gray-700 font-medium">
                    Question Categories
                  </Text>
                </View>
                <Text className="text-gray-500 text-sm mb-3">
                  Select categories to focus your test on specific subjects
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => {
                        if (selectedCategories.includes(category)) {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== category)
                          );
                        } else {
                          setSelectedCategories([
                            ...selectedCategories,
                            category,
                          ]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full ${
                        selectedCategories.includes(category)
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={
                          selectedCategories.includes(category)
                            ? "text-white"
                            : "text-gray-700"
                        }
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Instructions */}
              <View>
                <View className="flex-row items-center mb-3">
                  <Edit3 size={20} color="#4B5563" className="mr-2" />
                  <Text className="text-gray-700 font-medium">
                    Custom Instructions
                  </Text>
                </View>
                <Text className="text-gray-500 text-sm mb-3">
                  Add specific requirements for your test generation
                </Text>
                <TextInput
                  value={customInstructions}
                  onChangeText={setCustomInstructions}
                  placeholder="e.g., Focus on 20th century history, Include diagrams..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 h-24"
                />
              </View>
            </View>

            {/* Question Types */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-4">
                Question Types
              </Text>

              <View className="gap-4">
                {[
                  {
                    icon: <BookOpen size={20} color="#4F46E5" />,
                    title: "Multiple Choice",
                    description:
                      "Traditional multiple-choice questions with 4 options",
                  },
                  {
                    icon: <Clock size={20} color="#10B981" />,
                    title: "True/False",
                    description: "Statements that are either true or false",
                  },
                  {
                    icon: <Users size={20} color="#8B5CF6" />,
                    title: "Short Answer",
                    description:
                      "Brief written responses to open-ended questions",
                  },
                ].map((type, index) => (
                  <View
                    key={index}
                    className="flex-row items-start p-4 bg-gray-50 rounded-lg"
                  >
                    <View className="mt-0.5 mr-3">{type.icon}</View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800">
                        {type.title}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {type.description}
                      </Text>
                    </View>
                    <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center mt-0.5">
                      <View className="w-3 h-3 rounded-full bg-blue-500" />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* AI Processing Info */}
            <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <View className="flex-row items-center mb-3">
                <Brain size={20} color="#8B5CF6" />
                <Text className="text-lg font-bold text-gray-800 ml-2">
                  AI-Powered Generation
                </Text>
              </View>
              <Text className="text-gray-600 mb-3">
                Our AI will research your topic and automatically generate
                questions optimized for your learning level.
              </Text>
              <View className="bg-purple-50 rounded-lg p-4">
                <Text className="text-purple-800 font-medium mb-2">
                  What to expect:
                </Text>
                <Text className="text-purple-700 text-sm">
                  • Comprehensive topic research
                </Text>
                <Text className="text-purple-700 text-sm">
                  • Adaptive question generation
                </Text>
                <Text className="text-purple-700 text-sm">
                  • Personalized difficulty adjustment
                </Text>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              onPress={handleGenerateTest}
              className={`py-4 rounded-xl items-center ${
                testTitle.trim() && topic.trim() ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <Text
                className={`font-bold ${
                  testTitle.trim() && topic.trim()
                    ? "text-white"
                    : "text-gray-500"
                }`}
              >
                Generate Test
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Processing View */
          <View className="flex-1 items-center justify-center py-12">
            <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-8">
              <Brain size={48} color="#3B82F6" />
            </View>

            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Generating Test
            </Text>
            <Text className="text-gray-500 mb-10 text-center">
              Creating "{testTitle}" based on "{topic}"
            </Text>

            <View className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <View
                className="bg-blue-600 h-3 rounded-full"
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
                <View className="w-3 h-3 rounded-full bg-blue-600 mr-3" />
                <Text className="text-gray-700">
                  {
                    [
                      "Analyzing topic keywords...",
                      "Researching relevant information...",
                      "Generating questions...",
                      "Optimizing for learning...",
                    ][processingStep]
                  }
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TestGenerationScreen;
