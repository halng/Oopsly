import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
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
import { QuestionCreateReq } from "@/types/Question";

const TestSuiteDetailScreen = () => {
  const logger = Logger.extend("TestSuiteDetailScreen");
  const router = useRouter();
  const params = useLocalSearchParams();
  const testSuiteId = params.id as string;

  const { data: questions, isLoading } = useQuestions(testSuiteId);
  const createQuestionMutation = useCreateQuestion();
  const updateQuestionMutation = useUpdateQuestion();
  const deleteQuestionMutation = useDeleteQuestion();

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionForm, setQuestionForm] = useState<QuestionCreateReq>({
    content: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    explanation: "",
  });

  const openAddQuestionModal = () => {
    setQuestionForm({
      content: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
    });
    setEditingQuestionId("");
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q: any) => {
    setQuestionForm({
      content: q.content,
      options: q.options || ["", "", "", ""],
      correctOptionIndex: q.correctOptionIndex || 0,
      explanation: q.explanation || "",
    });
    setEditingQuestionId(q.id);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    if (!questionForm.content.trim() || questionForm.options.some((opt) => !opt.trim())) {
      alert("Please fill in the question and all options.");
      return;
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
    const newOptions = [...questionForm.options];
    newOptions[index] = text;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  return (
    <View className="flex-1 bg-gray-50" testID="test-suite-detail-screen">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm flex-row items-center border-b border-gray-100">
        <TouchableOpacity className="p-2 -ml-2 mr-2" onPress={() => router.back()}>
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 flex-1">Manage Test Questions</Text>
        <TouchableOpacity
          className="bg-indigo-100 p-2 rounded-full"
          onPress={openAddQuestionModal}
        >
          <Plus size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 mt-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-700 font-bold">Questions List</Text>
          <Text className="text-gray-500 text-sm">{questions?.length || 0} questions</Text>
        </View>

        {isLoading ? (
          <Text className="text-gray-500 mt-4 text-center">Loading questions...</Text>
        ) : questions?.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <CheckCircle size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4 text-center">No questions in this test suite yet.</Text>
            <TouchableOpacity
              className="mt-4 bg-indigo-600 px-6 py-3 rounded-xl"
              onPress={openAddQuestionModal}
            >
              <Text className="text-white font-bold">Add First Question</Text>
            </TouchableOpacity>
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
                <View className="pl-2 mb-3">
                  {item.options?.map((opt: string, idx: number) => (
                    <Text
                      key={idx}
                      className={idx === item.correctOptionIndex ? "text-green-600 font-medium" : "text-gray-600"}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </Text>
                  ))}
                </View>
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

                  <Text className="text-gray-700 font-medium mb-2">Options & Correct Answer</Text>
                  <Text className="text-gray-500 text-xs mb-3">Select the radio button for the correct option.</Text>

                  {questionForm.options.map((opt, idx) => (
                    <View key={idx} className="flex-row items-center mb-3">
                      <TouchableOpacity
                        className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                          questionForm.correctOptionIndex === idx ? "border-indigo-600 bg-indigo-600" : "border-gray-400"
                        }`}
                        onPress={() => setQuestionForm({ ...questionForm, correctOptionIndex: idx })}
                      >
                        {questionForm.correctOptionIndex === idx && <View className="w-2 h-2 rounded-full bg-white" />}
                      </TouchableOpacity>
                      <TextInput
                        className={`flex-1 border rounded-lg p-3 ${
                          questionForm.correctOptionIndex === idx
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-300 bg-gray-50"
                        }`}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChangeText={(text) => updateOption(text, idx)}
                      />
                    </View>
                  ))}

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
