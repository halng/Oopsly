import React, { useState } from "react";
import Toast from "react-native-toast-message";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Edit3,
  X,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react-native";
import { Logger } from "@/utils";
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from "@/hooks/queries/useQuestions";
import { QuestionCreateReq, QuestionType, Question } from "@/types/Question";

const TestSuiteDetailScreen = () => {
  const logger = Logger.extend("TestSuiteDetailScreen");
  const router = useRouter();
  const params = useLocalSearchParams();
  const testSuiteId = params.id as string;
  const testSuiteTitle = params.title as string;

  const { data: questions, isLoading } = useQuestions(testSuiteId);
  const createQuestionMutation = useCreateQuestion();
  const updateQuestionMutation = useUpdateQuestion();
  const deleteQuestionMutation = useDeleteQuestion();

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionForm, setQuestionForm] = useState<QuestionCreateReq>({
    content: "",
    type: QuestionType.SINGLE_CHOICE,
    options: ["", "", "", ""],
    correctOptionIndices: [0],
    explanation: "",
  });

  const openAddQuestionModal = () => {
    setQuestionForm({
      content: "",
      type: QuestionType.SINGLE_CHOICE,
      options: ["", "", "", ""],
      correctOptionIndices: [0],
      explanation: "",
    });
    setEditingQuestionId("");
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q: Question) => {
    setQuestionForm({
      content: q.content,
      type: q.type || QuestionType.SINGLE_CHOICE,
      options: q.options || ["", "", "", ""],
      correctOptionIndices: q.correctOptionIndices || [0],
      explanation: q.explanation || "",
    });
    setEditingQuestionId(q.id);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    if (!questionForm.content.trim()) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill in the question content.", position: "top" });
      return;
    }

    if (questionForm.type !== QuestionType.FILL_IN_THE_BLANK) {
      if (questionForm.options.some((opt) => !opt.trim())) {
        Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill in all options.", position: "top" });
        return;
      }
      if (questionForm.correctOptionIndices.length === 0) {
        Toast.show({ type: "error", text1: "Validation Error", text2: "Please select at least one correct option.", position: "top" });
        return;
      }
    } else {
      // For FILL_IN_THE_BLANK, we store the valid exact text answers in the options
      if (questionForm.options.length === 0 || !questionForm.options[0].trim()) {
        Toast.show({ type: "error", text1: "Validation Error", text2: "Please provide the correct blank answer.", position: "top" });
        return;
      }
      questionForm.correctOptionIndices = []; // Not used for fill in the blank natively
    }

    if (editingQuestionId) {
      updateQuestionMutation.mutate(
        { testSuiteId, id: editingQuestionId, data: questionForm },
        {
          onSuccess: () => setShowQuestionModal(false),
        }
      );
    } else {
      createQuestionMutation.mutate(
        { testSuiteId, data: questionForm },
        {
          onSuccess: () => setShowQuestionModal(false),
        }
      );
    }
  };

  const handleDeleteQuestion = (id: string) => {
    deleteQuestionMutation.mutate({ testSuiteId, id });
  };

  const updateOption = (text: string, index: number) => {
    if (questionForm.type === QuestionType.FILL_IN_THE_BLANK) {
      setQuestionForm({ ...questionForm, options: [text] }); // Only 1 distinct answer needed typically, but can be multiple acceptable
    } else {
      const newOptions = [...questionForm.options];
      newOptions[index] = text;
      setQuestionForm({ ...questionForm, options: newOptions });
    }
  };

  const toggleCorrectOption = (index: number) => {
    let currentIndices = [...questionForm.correctOptionIndices];
    if (questionForm.type === QuestionType.SINGLE_CHOICE || questionForm.type === QuestionType.TRUE_FALSE) {
      currentIndices = [index];
    } else if (questionForm.type === QuestionType.MULTIPLE_CHOICE) {
      if (currentIndices.includes(index)) {
        currentIndices = currentIndices.filter((i) => i !== index);
      } else {
        currentIndices.push(index);
      }
    }
    setQuestionForm({ ...questionForm, correctOptionIndices: currentIndices });
  };

  return (
    <View className="flex-1 bg-gray-50" testID="test-suite-detail-screen">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              className="p-2 -ml-2"
              onPress={() => router.back()}
              testID="back-button"
            >
              <ChevronLeft size={24} color="#4B5563" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800 ml-2 flex-1" numberOfLines={1}>
              {testSuiteTitle || "Test Suite Details"}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Actions */}
      <View className="px-4 mt-6">
        <TouchableOpacity
          className={`bg-indigo-600 rounded-xl py-5 mb-4 items-center shadow-sm ${!questions?.length ? "opacity-60" : ""}`}
          onPress={() => router.push(`/take-test/${testSuiteId}`)}
          disabled={!questions?.length}
        >
          <Text className="text-white text-lg font-bold">Take Test</Text>
          <Text className="text-indigo-200 mt-1 font-medium">{questions?.length || 0} questions ready</Text>
        </TouchableOpacity>

        <View className="flex-col gap-3 mt-2">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
              onPress={openAddQuestionModal}
            >
              <Plus size={20} color="#4B5563" />
              <Text className="text-gray-800 font-bold ml-2">
                {questions?.length === 0 ? "Add First Question" : "Add Question"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Questions List */}
      <View className="flex-1 px-4 mt-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-700 font-bold">Questions in this test</Text>
          <Text className="text-gray-500 text-sm">{questions?.length || 0} questions</Text>
        </View>

        {isLoading ? (
          <Text className="text-gray-500 mt-4 text-center">Loading questions...</Text>
        ) : questions?.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <CheckCircle size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4 text-center">No questions in this test suite yet</Text>
          </View>
        ) : (
          <FlatList
            data={questions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
                <Text className="text-gray-800 font-bold mb-2">
                  {index + 1}. {item.content}
                </Text>
                <View className="flex-row items-center mb-2">
                  <View className="bg-indigo-100 rounded-md px-2 py-0.5">
                    <Text className="text-indigo-800 text-xs font-semibold">{item.type.replace(/_/g, " ")}</Text>
                  </View>
                </View>

                {item.type !== QuestionType.FILL_IN_THE_BLANK ? (
                  <View className="pl-2 mb-3">
                    {item.options?.map((opt: string, idx: number) => (
                      <Text
                        key={idx}
                        className={item.correctOptionIndices?.includes(idx) ? "text-green-600 font-medium" : "text-gray-600"}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <View className="pl-2 mb-3">
                    <Text className="text-green-600 font-medium">Answer: {item.options?.[0]}</Text>
                  </View>
                )}
                <View className="flex-row justify-end mt-2 pt-2 border-t border-gray-50">
                  <TouchableOpacity className="p-2 mr-2" onPress={() => openEditQuestionModal(item)}>
                    <Edit3 size={18} color="#4B5563" />
                  </TouchableOpacity>
                  <TouchableOpacity className="p-2" onPress={() => handleDeleteQuestion(item.id)}>
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Question Modal */}
      <Modal visible={showQuestionModal} transparent animationType="slide" onRequestClose={() => setShowQuestionModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                {editingQuestionId ? "Edit Question" : "Add Question"}
              </Text>
              <TouchableOpacity className="p-2" onPress={() => setShowQuestionModal(false)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[]}
              keyExtractor={() => "dummy"}
              renderItem={() => null}
              ListHeaderComponent={
                <View className="pb-8">
                  <View className="mb-4">
                    <Text className="text-gray-700 font-medium mb-2">Question Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
                      {Object.values(QuestionType).map((type) => (
                        <TouchableOpacity
                          key={type}
                          className={`mr-2 px-4 py-2 rounded-full border ${
                            questionForm.type === type
                              ? "bg-indigo-600 border-indigo-600"
                              : "bg-white border-gray-300"
                          }`}
                          onPress={() => {
                            const newOptions =
                              type === QuestionType.TRUE_FALSE
                                ? ["True", "False"]
                                : type === QuestionType.FILL_IN_THE_BLANK
                                ? [""]
                                : ["", "", "", ""];
                            setQuestionForm({
                              ...questionForm,
                              type,
                              options: newOptions,
                              correctOptionIndices: type === QuestionType.FILL_IN_THE_BLANK ? [] : [0],
                            });
                          }}
                        >
                          <Text
                            className={
                              questionForm.type === type ? "text-white font-medium" : "text-gray-600"
                            }
                          >
                            {type.replace(/_/g, " ")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-700 font-medium mb-2">Question Content</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                      placeholder="Enter question text"
                      value={questionForm.content}
                      onChangeText={(text) => setQuestionForm({ ...questionForm, content: text })}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <Text className="text-gray-700 font-medium mb-2">
                    {questionForm.type === QuestionType.FILL_IN_THE_BLANK ? "Correct Answer" : "Options & Correct Answer"}
                  </Text>
                  <Text className="text-gray-500 text-xs mb-3">
                    {questionForm.type === QuestionType.MULTIPLE_CHOICE
                      ? "Select the checkboxes for all correct options."
                      : questionForm.type === QuestionType.FILL_IN_THE_BLANK
                      ? "Enter the exact word/phrase for the blank."
                      : "Select the radio button for the correct option."}
                  </Text>

                  {questionForm.type !== QuestionType.FILL_IN_THE_BLANK ? (
                    questionForm.options.map((opt, idx) => {
                      const isCorrect = questionForm.correctOptionIndices.includes(idx);
                      const isCheckbox = questionForm.type === QuestionType.MULTIPLE_CHOICE;
                      return (
                        <View key={idx} className="flex-row items-center mb-3">
                          <TouchableOpacity
                            className={`mr-3 items-center justify-center ${
                              isCheckbox ? "w-6 h-6 rounded" : "w-6 h-6 rounded-full"
                            } border-2 ${
                              isCorrect ? "border-indigo-600 bg-indigo-600" : "border-gray-400"
                            }`}
                            onPress={() => toggleCorrectOption(idx)}
                          >
                            {isCorrect && (
                              <View className={isCheckbox ? "w-3 h-3 bg-white" : "w-2 h-2 rounded-full bg-white"} />
                            )}
                          </TouchableOpacity>
                          <TextInput
                            className={`flex-1 border rounded-lg p-3 ${
                              isCorrect ? "border-indigo-300 bg-indigo-50" : "border-gray-300 bg-gray-50"
                            }`}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            value={opt}
                            onChangeText={(text) => updateOption(text, idx)}
                            editable={questionForm.type !== QuestionType.TRUE_FALSE}
                          />
                        </View>
                      );
                    })
                  ) : (
                    <View className="mb-3">
                      <TextInput
                        className="border border-indigo-300 bg-indigo-50 rounded-lg p-3"
                        placeholder="Expected answer (e.g. Washington)"
                        value={questionForm.options[0]}
                        onChangeText={(text) => updateOption(text, 0)}
                      />
                    </View>
                  )}

                  <View className="mb-6 mt-2">
                    <Text className="text-gray-700 font-medium mb-2">Explanation (Optional)</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                      placeholder="Why is it the correct answer?"
                      value={questionForm.explanation}
                      onChangeText={(text) => setQuestionForm({ ...questionForm, explanation: text })}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <TouchableOpacity
                    className={`rounded-xl py-4 items-center ${
                      questionForm.content.trim() ? "bg-indigo-600" : "bg-gray-400"
                    }`}
                    onPress={handleSaveQuestion}
                  >
                    <Text className="text-white font-bold text-lg">
                      {editingQuestionId ? "Update Question" : "Save Question"}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TestSuiteDetailScreen;
