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
  Plus,
  Trash2,
  Save,
  AlertCircle,
  BookOpen,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

type QuestionType = 
  | "multiple-choice" 
  | "true-false" 
  | "single-choice" 
  | "fill-in-blank" 
  | "matching";

interface BaseQuestion {
  id: number;
  question: string;
  explanation: string;
  type: QuestionType;
}

interface MultipleChoiceQuestion extends BaseQuestion {
  options: string[];
  correctAnswers: number[];
}

interface TrueFalseQuestion extends BaseQuestion {
  correctAnswer: boolean;
}

interface SingleChoiceQuestion extends BaseQuestion {
  options: string[];
  correctAnswer: number;
}

interface FillInBlankQuestion extends BaseQuestion {
  correctAnswer: string;
}

interface MatchingQuestion extends BaseQuestion {
  pairs: { term: string; definition: string }[];
  correctPairs: number[]; // Indices of correctly matched pairs
}

type Question = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | SingleChoiceQuestion 
  | FillInBlankQuestion 
  | MatchingQuestion;

const ManualTestCreationScreen = () => {
  const router = useRouter();
  const [testTitle, setTestTitle] = useState("");
  const [testTopic, setTestTopic] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { 
      id: 1, 
      question: "", 
      options: ["", "", "", ""], 
      correctAnswers: [0],
      explanation: "",
      type: "multiple-choice"
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: number]: boolean}>({});

  // Toggle section expansion
  const toggleSection = (id: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add a new question
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { 
        id: questions.length + 1, 
        question: "", 
        options: ["", "", "", ""], 
        correctAnswers: [0],
        explanation: "",
        type: "multiple-choice"
      },
    ]);
  };

  // Update a question field
  const updateQuestionField = (id: number, field: string, value: any) => {
    setQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      )
    );
  };

  // Update an option
  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && ('options' in q)) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  // Toggle correct answer for multiple choice
  const toggleCorrectAnswer = (questionId: number, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "multiple-choice" && 'correctAnswers' in q) {
          const newCorrectAnswers = q.correctAnswers.includes(optionIndex)
            ? q.correctAnswers.filter(i => i !== optionIndex)
            : [...q.correctAnswers, optionIndex];
          return { ...q, correctAnswers: newCorrectAnswers };
        }
        return q;
      })
    );
  };

  // Set single correct answer
  const setCorrectAnswer = (questionId: number, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && (q.type === "single-choice" || q.type === "multiple-choice") && 'correctAnswers' in q) {
          return { ...q, correctAnswers: [optionIndex] };
        }
        if (q.id === questionId && q.type === "single-choice" && 'correctAnswer' in q) {
          return { ...q, correctAnswer: optionIndex };
        }
        return q;
      })
    );
  };

  // Update true/false answer
  const updateTrueFalseAnswer = (questionId: number, value: boolean) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "true-false" && 'correctAnswer' in q) {
          return { ...q, correctAnswer: value };
        }
        return q;
      })
    );
  };

  // Update fill in blank answer
  const updateFillInBlankAnswer = (questionId: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "fill-in-blank" && 'correctAnswer' in q) {
          return { ...q, correctAnswer: value };
        }
        return q;
      })
    );
  };

  // Add matching pair
  const addMatchingPair = (questionId: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "matching" && 'pairs' in q) {
          return { 
            ...q, 
            pairs: [...q.pairs, { term: "", definition: "" }]
          };
        }
        return q;
      })
    );
  };

  // Update matching pair
  const updateMatchingPair = (questionId: number, pairIndex: number, field: 'term' | 'definition', value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "matching" && 'pairs' in q) {
          const newPairs = [...q.pairs];
          newPairs[pairIndex] = { ...newPairs[pairIndex], [field]: value };
          return { ...q, pairs: newPairs };
        }
        return q;
      })
    );
  };

  // Remove a question
  const removeQuestion = (id: number) => {
    if (questions.length <= 1) {
      Alert.alert(
        "Cannot Remove",
        "You need at least one question to create a test."
      );
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Change question type
  const changeQuestionType = (questionId: number, type: QuestionType) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          // Reset question structure based on type
          switch (type) {
            case "multiple-choice":
              return {
                id: q.id,
                question: q.question,
                options: ["", "", "", ""],
                correctAnswers: [0],
                explanation: q.explanation,
                type: "multiple-choice"
              };
            case "single-choice":
              return {
                id: q.id,
                question: q.question,
                options: ["", "", "", ""],
                correctAnswer: 0,
                explanation: q.explanation,
                type: "single-choice"
              };
            case "true-false":
              return {
                id: q.id,
                question: q.question,
                correctAnswer: true,
                explanation: q.explanation,
                type: "true-false"
              };
            case "fill-in-blank":
              return {
                id: q.id,
                question: q.question,
                correctAnswer: "",
                explanation: q.explanation,
                type: "fill-in-blank"
              };
            case "matching":
              return {
                id: q.id,
                question: q.question,
                pairs: [{ term: "", definition: "" }],
                correctPairs: [],
                explanation: q.explanation,
                type: "matching"
              };
            default:
              return q;
          }
        }
        return q;
      })
    );
  };

  // Validate and save test
  const handleSave = () => {
    if (!testTitle.trim()) {
      Alert.alert("Test Title Required", "Please enter a test title.");
      return;
    }

    if (!testTopic.trim()) {
      Alert.alert("Test Topic Required", "Please enter a test topic.");
      return;
    }

    const invalidQuestions = questions.filter((q) => {
      if (!q.question.trim()) return true;
      
      switch (q.type) {
        case "multiple-choice":
        case "single-choice":
          return !('options' in q) || q.options.some(opt => !opt.trim());
        case "true-false":
          return false; // No additional validation needed
        case "fill-in-blank":
          return !('correctAnswer' in q) || !q.correctAnswer.trim();
        case "matching":
          return !('pairs' in q) || q.pairs.some(pair => !pair.term.trim() || !pair.definition.trim());
        default:
          return true;
      }
    });

    if (invalidQuestions.length > 0) {
      Alert.alert(
        "Incomplete Questions",
        "Please fill in all required fields for each question, or remove empty questions."
      );
      return;
    }

    setIsSaving(true);
    
    // Simulate saving process
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert(
        "Success",
        "Your test has been saved successfully!",
        [
          {
            text: "OK",
            onPress: () => router.push("/"),
          },
        ]
      );
    }, 1500);
  };

  // Render question based on type
  const renderQuestionContent = (q: Question, index: number) => {
    switch (q.type) {
      case "multiple-choice":
        return (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Answer Options</Text>
              {q.options.map((option, optIndex) => (
                <View key={optIndex} className="flex-row items-start mb-3">
                  <TouchableOpacity
                    onPress={() => toggleCorrectAnswer(q.id, optIndex)}
                    className={`w-6 h-6 rounded border-2 items-center justify-center mt-3 mr-3 ${
                      q.correctAnswers.includes(optIndex)
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {q.correctAnswers.includes(optIndex) && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </TouchableOpacity>
                  <View className="flex-1">
                    <TextInput
                      value={option}
                      onChangeText={(value) => updateOption(q.id, optIndex, value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                      className="border border-gray-300 rounded-lg p-3 text-gray-800"
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        );

      case "single-choice":
        return (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Answer Options</Text>
              {q.options.map((option, optIndex) => (
                <View key={optIndex} className="flex-row items-start mb-3">
                  <TouchableOpacity
                    onPress={() => setCorrectAnswer(q.id, optIndex)}
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center mt-3 mr-3 ${
                      ('correctAnswer' in q && q.correctAnswer === optIndex) ||
                      (q.correctAnswers && q.correctAnswers[0] === optIndex)
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {(('correctAnswer' in q && q.correctAnswer === optIndex) ||
                      (q.correctAnswers && q.correctAnswers[0] === optIndex)) && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </TouchableOpacity>
                  <View className="flex-1">
                    <TextInput
                      value={option}
                      onChangeText={(value) => updateOption(q.id, optIndex, value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                      className="border border-gray-300 rounded-lg p-3 text-gray-800"
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        );

      case "true-false":
        return (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Correct Answer</Text>
              <View className="flex-row justify-around">
                <TouchableOpacity
                  onPress={() => updateTrueFalseAnswer(q.id, true)}
                  className={`flex-row items-center px-6 py-3 rounded-lg ${
                    q.correctAnswer ? "bg-green-100 border border-green-500" : "bg-gray-100"
                  }`}
                >
                  <Text className={`font-medium ${q.correctAnswer ? "text-green-700" : "text-gray-700"}`}>
                    True
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateTrueFalseAnswer(q.id, false)}
                  className={`flex-row items-center px-6 py-3 rounded-lg ${
                    !q.correctAnswer ? "bg-green-100 border border-green-500" : "bg-gray-100"
                  }`}
                >
                  <Text className={`font-medium ${!q.correctAnswer ? "text-green-700" : "text-gray-700"}`}>
                    False
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        );

      case "fill-in-blank":
        return (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Correct Answer</Text>
              <TextInput
                value={q.correctAnswer}
                onChangeText={(value) => updateFillInBlankAnswer(q.id, value)}
                placeholder="Enter the correct answer"
                className="border border-gray-300 rounded-lg p-4 text-gray-800"
              />
            </View>
          </>
        );

      case "matching":
        return (
          <>
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-700">Matching Pairs</Text>
                <TouchableOpacity
                  onPress={() => addMatchingPair(q.id)}
                  className="flex-row items-center bg-blue-100 rounded-lg px-3 py-1"
                >
                  <Plus size={14} color="#03A9F4" />
                  <Text className="text-blue-700 font-medium ml-1">Add Pair</Text>
                </TouchableOpacity>
              </View>
              
              {q.pairs.map((pair, pairIndex) => (
                <View key={pairIndex} className="flex-row mb-3 gap-2">
                  <View className="flex-1">
                    <TextInput
                      value={pair.term}
                      onChangeText={(value) => updateMatchingPair(q.id, pairIndex, 'term', value)}
                      placeholder="Term"
                      className="border border-gray-300 rounded-lg p-3 text-gray-800"
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      value={pair.definition}
                      onChangeText={(value) => updateMatchingPair(q.id, pairIndex, 'definition', value)}
                      placeholder="Definition"
                      className="border border-gray-300 rounded-lg p-3 text-gray-800"
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}"
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            Create Test Manually
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Test Info Section */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Test Information
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2">Test Title</Text>
            <TextInput
              value={testTitle}
              onChangeText={setTestTitle}
              placeholder="e.g., Biology Final Exam"
              className="border border-gray-300 rounded-lg p-4 text-gray-800"
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-2">Test Topic</Text>
            <TextInput
              value={testTopic}
              onChangeText={setTestTopic}
              placeholder="e.g., Cell Biology, World History"
              className="border border-gray-300 rounded-lg p-4 text-gray-800"
            />
          </View>
        </View>

        {/* Questions Section */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">
              Questions ({questions.length})
            </Text>
            <TouchableOpacity
              onPress={addQuestion}
              className="flex-row items-center bg-green-100 rounded-lg px-3 py-2"
            >
              <Plus size={16} color="#8BC34A" />
              <Text className="text-green-700 font-medium ml-1">Add Question</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 mb-4">
            Create custom test questions with different question types
          </Text>

          {questions.map((q, index) => (
            <View
              key={q.id}
              className={`border border-gray-200 rounded-xl p-4 mb-6 ${
                index !== questions.length - 1 ? "mb-6" : ""
              }`}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-bold text-gray-700">
                  Question #{index + 1}
                </Text>
                {questions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeQuestion(q.id)}
                    className="p-2"
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2">Question Text</Text>
                <TextInput
                  value={q.question}
                  onChangeText={(value) =>
                    updateQuestionField(q.id, "question", value)
                  }
                  placeholder="Enter your question"
                  multiline
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 min-h-20"
                />
              </View>

              {/* Question Type Selector */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2">Question Type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {([
                    { type: "multiple-choice", label: "Multiple Choice" },
                    { type: "single-choice", label: "Single Choice" },
                    { type: "true-false", label: "True/False" },
                    { type: "fill-in-blank", label: "Fill in Blank" },
                    { type: "matching", label: "Matching" }
                  ] as const).map(({ type, label }) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => changeQuestionType(q.id, type)}
                      className={`px-3 py-2 rounded-lg ${
                        q.type === type
                          ? "bg-green-600"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          q.type === type ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Question Content Based on Type */}
              {renderQuestionContent(q, index)}

              <View>
                <Text className="text-gray-700 mb-2">Explanation (Optional)</Text>
                <TextInput
                  value={q.explanation}
                  onChangeText={(value) =>
                    updateQuestionField(q.id, "explanation", value)
                  }
                  placeholder="Explanation for the correct answer"
                  multiline
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 min-h-20"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <View className="flex-row items-center mb-3">
            <HelpCircle size={20} color="#FF9800" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Question Tips
            </Text>
          </View>
          <View className="bg-orange-50 rounded-lg p-4">
            <Text className="text-orange-800 font-medium mb-2">
              Best practices:
            </Text>
            <Text className="text-orange-700 text-sm mb-1">
              • Write clear, unambiguous questions
            </Text>
            <Text className="text-orange-700 text-sm mb-1">
              • For multiple choice, ensure options are plausible
            </Text>
            <Text className="text-orange-700 text-sm">
              • Provide explanations to aid learning
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`py-4 rounded-xl items-center ${
            isSaving ? "bg-green-400" : "bg-green-600"
          }`}
        >
          {isSaving ? (
            <View className="flex-row items-center">
              <View className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
              <Text className="font-bold text-white">Saving...</Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Save size={20} color="white" />
              <Text className="font-bold text-white ml-2">
                Save Test
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ManualTestCreationScreen;