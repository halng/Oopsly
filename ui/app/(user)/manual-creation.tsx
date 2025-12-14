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
  Brain,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react-native";

const ManualCreationScreen = () => {
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("");
  const [flashcards, setFlashcards] = useState([
    { id: 1, question: "", answer: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Add a new flashcard
  const addFlashcard = () => {
    setFlashcards([
      ...flashcards,
      { id: flashcards.length + 1, question: "", answer: "" },
    ]);
  };

  // Update a flashcard
  const updateFlashcard = (id: number, field: string, value: string) => {
    setFlashcards(
      flashcards.map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  };

  // Remove a flashcard
  const removeFlashcard = (id: number) => {
    if (flashcards.length <= 1) {
      Alert.alert(
        "Cannot Remove",
        "You need at least one flashcard to create a subject."
      );
      return;
    }
    setFlashcards(flashcards.filter((card) => card.id !== id));
  };

  // Validate and save flashcards
  const handleSave = () => {
    if (!subjectName.trim()) {
      Alert.alert("Subject Name Required", "Please enter a subject name.");
      return;
    }

    const emptyCards = flashcards.filter(
      (card) => !card.question.trim() || !card.answer.trim()
    );

    if (emptyCards.length > 0) {
      Alert.alert(
        "Incomplete Flashcards",
        "Please fill in all question and answer fields, or remove empty cards."
      );
      return;
    }

    setIsSaving(true);
    
    // Simulate saving process
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert(
        "Success",
        "Your flashcards have been saved successfully!",
        [
          {
            text: "OK",
            onPress: () => router.push("/"),
          },
        ]
      );
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
            Create Flashcards
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Subject Name Section */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Subject Details
          </Text>

          <View>
            <Text className="text-gray-700 mb-2">Subject Name</Text>
            <TextInput
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="e.g., Biology Chapter 3"
              className="border border-gray-300 rounded-lg p-4 text-gray-800"
            />
          </View>
        </View>

        {/* Flashcards Section */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">
              Flashcards ({flashcards.length})
            </Text>
            <TouchableOpacity
              onPress={addFlashcard}
              className="flex-row items-center bg-indigo-100 rounded-lg px-3 py-2"
            >
              <Plus size={16} color="#4F46E5" />
              <Text className="text-indigo-700 font-medium ml-1">Add Card</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 mb-4">
            Create custom flashcards by entering your own questions and answers
          </Text>

          {flashcards.map((card, index) => (
            <View
              key={card.id}
              className={`border border-gray-200 rounded-xl p-4 mb-4 ${
                index !== flashcards.length - 1 ? "mb-4" : ""
              }`}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-bold text-gray-700">
                  Card #{index + 1}
                </Text>
                {flashcards.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeFlashcard(card.id)}
                    className="p-2"
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 mb-2">Question</Text>
                <TextInput
                  value={card.question}
                  onChangeText={(value) =>
                    updateFlashcard(card.id, "question", value)
                  }
                  placeholder="Enter your question"
                  multiline
                  className="border border-gray-300 rounded-lg p-4 text-gray-800 min-h-20"
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2">Answer</Text>
                <TextInput
                  value={card.answer}
                  onChangeText={(value) =>
                    updateFlashcard(card.id, "answer", value)
                  }
                  placeholder="Enter your answer"
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
            <Brain size={20} color="#8B5CF6" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Creation Tips
            </Text>
          </View>
          <View className="bg-purple-50 rounded-lg p-4">
            <Text className="text-purple-800 font-medium mb-2">
              Best practices:
            </Text>
            <Text className="text-purple-700 text-sm mb-1">
              • Keep questions concise and specific
            </Text>
            <Text className="text-purple-700 text-sm mb-1">
              • Use clear, unambiguous answers
            </Text>
            <Text className="text-purple-700 text-sm">
              • Focus on one key concept per card
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`py-4 rounded-xl items-center ${
            isSaving ? "bg-indigo-400" : "bg-indigo-600"
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
                Save Flashcards
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ManualCreationScreen;