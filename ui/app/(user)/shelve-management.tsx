import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Edit3,
  Save,
  X,
  Trash2,
  BookOpen,
  Clock,
  BarChart2,
  Eye,
  Play,
} from "lucide-react-native";

export default function ShelveManagementScreen() {
  const router = useRouter();

  // Mock shelve data - in a real app this would come from props or API
  const [shelveData, setShelveData] = useState({
    id: "1",
    name: "Biology Fundamentals",
    description:
      "Basic concepts of biology including cell structure, genetics, and evolution",
    icon: "https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8U3R1ZGVudCUyMGxlYXJuZXIlMjBwdXBpbCUyMGVkdWNhdGlvbnxlbnwwfHwwfHx8MA%3D%3D",
    cardCount: 42,
    lastStudied: "2023-05-15",
    retentionRate: 82,
    isEditing: false,
  });

  const [editedName, setEditedName] = useState(shelveData.name);
  const [editedDescription, setEditedDescription] = useState(
    shelveData.description
  );

  const handleEdit = () => {
    setEditedName(shelveData.name);
    setEditedDescription(shelveData.description);
    setShelveData({ ...shelveData, isEditing: true });
  };

  const handleSave = () => {
    if (editedName.trim().length === 0) {
      Alert.alert("Validation Error", "Shelve name cannot be empty");
      return;
    }

    setShelveData({
      ...shelveData,
      name: editedName,
      description: editedDescription,
      isEditing: false,
    });

    // In a real app, you would save to your backend here
    Alert.alert("Success", "Shelve updated successfully");
  };

  const handleCancel = () => {
    setShelveData({ ...shelveData, isEditing: false });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Shelve",
      "Are you sure you want to delete this shelve? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // In a real app, you would delete from your backend here
            Alert.alert("Success", "Shelve deleted successfully");
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Shelve Management
          </Text>
          {shelveData.isEditing ? (
            <View className="flex-row">
              <TouchableOpacity
                className="p-2 mr-2 bg-gray-200 rounded-full"
                onPress={handleCancel}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 bg-indigo-600 rounded-full"
                onPress={handleSave}
              >
                <Save size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="p-2 bg-indigo-600 rounded-full"
              onPress={handleEdit}
            >
              <Edit3 size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Shelve Preview Card */}
        <View className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-xl bg-indigo-100 items-center justify-center mr-4">
              <Image
                source={{ uri: shelveData.icon }}
                className="w-full h-full rounded-xl"
              />
            </View>
            {shelveData.isEditing ? (
              <TextInput
                className="flex-1 text-lg font-bold text-gray-900 border-b border-indigo-300 py-1"
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Shelve name"
              />
            ) : (
              <Text className="text-xl font-bold text-gray-900 flex-1">
                {shelveData.name}
              </Text>
            )}
          </View>

          {shelveData.isEditing ? (
            <TextInput
              className="text-gray-600 mb-4 border-b border-gray-300 py-1"
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Shelve description"
              multiline
            />
          ) : (
            <Text className="text-gray-600 mb-4">{shelveData.description}</Text>
          )}

          <View className="flex-row justify-between mt-4">
            <View className="flex-row items-center">
              <BookOpen size={16} color="#6B7280" />
              <Text className="text-gray-500 ml-2">
                {shelveData.cardCount} cards
              </Text>
            </View>
            <Text className="text-gray-500">
              Last studied: {shelveData.lastStudied}
            </Text>
          </View>
        </View>

        {/* High-level Stats */}
        <View className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Shelve Statistics
          </Text>
          <View className="flex-row justify-between mb-3">
            <View className="flex-row items-center">
              <BarChart2 size={20} color="#6366F1" />
              <Text className="text-gray-600 ml-2">Retention Rate</Text>
            </View>
            <Text className="font-bold text-lg text-indigo-600">
              {shelveData.retentionRate}%
            </Text>
          </View>
          <View className="flex-row justify-between">
            <View className="flex-row items-center">
              <BookOpen size={20} color="#10B981" />
              <Text className="text-gray-600 ml-2">Cards Count</Text>
            </View>
            <Text className="font-bold text-lg text-emerald-500">
              {shelveData.cardCount}
            </Text>
          </View>
        </View>

        {/* Time Estimate Delight Factor */}
        <View className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-5 mb-6">
          <View className="flex-row items-center">
            <Clock size={24} color="white" />
            <Text className="text-white font-bold ml-2">Time Estimate</Text>
          </View>
          <Text className="text-white text-2xl font-bold mt-2">
            15 mins remaining
          </Text>
          <Text className="text-indigo-100 mt-1">
            Based on your average answer speed
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="bg-white rounded-xl shadow-sm p-5">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Study Options
          </Text>

          <TouchableOpacity
            className="flex-row items-center p-4 bg-indigo-600 rounded-lg mb-3"
            onPress={() => router.push("/study/1")}
          >
            <Play size={20} color="white" />
            <Text className="text-white font-bold ml-3 flex-1">Study Now</Text>
            <Text className="text-indigo-200">42 cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 bg-white border border-gray-200 rounded-lg mb-3"
            onPress={() => router.push("/study/1")}
          >
            <BarChart2 size={20} color="#6366F1" />
            <Text className="text-gray-900 font-medium ml-3 flex-1">
              Custom Study
            </Text>
            <Text className="text-gray-500">Create session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 bg-white border border-gray-200 rounded-lg"
            onPress={() => router.push("/study/1")}
          >
            <Eye size={20} color="#6B7280" />
            <Text className="text-gray-900 font-medium ml-3 flex-1">
              Browse Cards
            </Text>
            <Text className="text-gray-500">View all</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 bg-red-50 rounded-lg mt-4"
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text className="text-red-600 font-medium ml-3">Delete Shelve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
