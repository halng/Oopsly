import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Flame,
  BookOpen,
  Languages,
  Code,
  Database,
  Calendar,
  StickyNote,
  CheckSquare,
  User,
  PlusCircle,
  X,
  Smile,
  Heart,
  Star,
  Zap,
  Trophy,
  Target,
  Bookmark,
  Coffee,
  Music,
  Camera,
  Globe,
  Umbrella,
  Gift,
} from "lucide-react-native";
import { createShelf, fetchShelves } from "@/services/ShelfService"
import { Shelf } from "@/types/Shelf";
import { SubjectStats } from "@/types/Subject";

// Available icons for shelf creation
const availableIcons = [
  { name: 'Code', component: Code, color: '#4F46E5' },
  { name: 'Languages', component: Languages, color: '#10B981' },
  { name: 'BookOpen', component: BookOpen, color: '#EF4444' },
  { name: 'Database', component: Database, color: '#8B5CF6' },
  { name: 'Heart', component: Heart, color: '#EC4899' },
  { name: 'Star', component: Star, color: '#F59E0B' },
  { name: 'Zap', component: Zap, color: '#FBBF24' },
  { name: 'Trophy', component: Trophy, color: '#F97316' },
  { name: 'Target', component: Target, color: '#06B6D4' },
  { name: 'Bookmark', component: Bookmark, color: '#3B82F6' },
  { name: 'Coffee', component: Coffee, color: '#92400E' },
  { name: 'Music', component: Music, color: '#9333EA' },
  { name: 'Camera', component: Camera, color: '#14B8A6' },
  { name: 'Globe', component: Globe, color: '#0EA5E9' },
  { name: 'Umbrella', component: Umbrella, color: '#6366F1' },
  { name: 'Gift', component: Gift, color: '#EC4899' },
];

// // Dummy data for shelves and subjects
// const dummyData = [
//   {
//     id: "1",
//     name: "Computer Science",
//     icon: <Code size={20} color="#4F46E5" />,
//     subjects: [
//       { id: "1-1", name: "Data Structures", dueCount: 12, totalCount: 45 },
//       { id: "1-2", name: "Algorithms", dueCount: 8, totalCount: 32 },
//       { id: "1-3", name: "System Design", dueCount: 5, totalCount: 28 },
//       { id: "1-4", name: "Machine Learning", dueCount: 15, totalCount: 60 },
//     ],
//   },
//   {
//     id: "2",
//     name: "Languages",
//     icon: <Languages size={20} color="#10B981" />,
//     subjects: [
//       { id: "2-1", name: "Japanese Kanji N5", dueCount: 22, totalCount: 120 },
//       { id: "2-2", name: "Spanish Vocabulary", dueCount: 7, totalCount: 85 },
//       { id: "2-3", name: "French Grammar", dueCount: 3, totalCount: 50 },
//     ],
//   },
//   {
//     id: "3",
//     name: "Liberal Arts",
//     icon: <BookOpen size={20} color="#EF4444" />,
//     subjects: [
//       { id: "3-1", name: "World History", dueCount: 18, totalCount: 95 },
//       { id: "3-2", name: "Philosophy", dueCount: 9, totalCount: 42 },
//       { id: "3-3", name: "Art History", dueCount: 6, totalCount: 38 },
//     ],
//   },
//   {
//     id: "4",
//     name: "Sciences",
//     icon: <Database size={20} color="#8B5CF6" />,
//     subjects: [
//       { id: "4-1", name: "Organic Chemistry", dueCount: 25, totalCount: 110 },
//       { id: "4-2", name: "Biology Fundamentals", dueCount: 14, totalCount: 75 },
//       { id: "4-3", name: "Physics Concepts", dueCount: 11, totalCount: 68 },
//     ],
//   },
// ];

const OopslyApp = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [shelfName, setShelfName] = useState('');
  const [shelfDescription, setShelfDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>();

  const fetchShelvesData = () => {
    fetchShelves({
      page: 0,
      size: 100,
    })
      .then((response) => {
        if (response.isSuccess) {
          setShelves(response.data.entities);
        } else {
          console.error('Failed to fetch shelves:', response.message);
        }
      })
      .catch((error) => {
        console.error('Error fetching shelves:', error);
      });
  }

  useEffect(() => {
    fetchShelvesData();
  }, []);

  // Handle shelf creation
  const handleCreateShelf = () => {
    if (shelfName.trim() === '') {
      alert('Please enter a shelf name');
      return;
    }
    
    // In a real app, you would save this data to your backend or local storage
    console.log('Creating shelf:', {
      name: shelfName,
      description: shelfDescription,
      icon: selectedIcon.name,
    });

    createShelf({
      icon: selectedIcon.name,
      name: shelfName,
      description: shelfDescription,
    }).then((response) => {
      console.log('Shelf created successfully:', response);
      fetchShelvesData();
    }).catch((error) => {
      console.error('Error creating shelf:', error);
    });
    
    // Reset form and close modal
    setShelfName('');
    setShelfDescription('');
    setSelectedIcon(availableIcons[0]);
    setModalVisible(false);
  };

  // Render subject cards horizontally
  const renderSubjectCards = (subjects: SubjectStats[]) => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-40"
      >
        <View className="flex-row gap-4 px-4 pb-2">
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              className="bg-white rounded-xl p-4 w-60 shadow-sm border border-gray-100"
              onPress={() => router.push(`/subject/${subject.id}`)}
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-gray-800 text-lg">
                  {subject.name}
                </Text>
                <View className="bg-blue-50 rounded-full px-2 py-1">
                  <Text className="text-blue-600 text-xs font-semibold">
                    {subject.overdue} due
                  </Text>
                </View>
              </View>

              <View className="mt-2">
                <View className="flex-row items-center">
                  <View className="flex-1 bg-gray-200 rounded-full h-2">
                    <View
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${subject.completedPercent ? subject.completedPercent : 0}%`,
                      }}
                    />
                  </View>
                  <Text className="text-gray-500 text-xs ml-2">
                    {subject.completedPercent ? subject.completedPercent : 0}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderIconComponent = (iconName: string) => {
    const icon = availableIcons.find((icon) => icon.name.toLowerCase() === iconName.toLowerCase());
    return icon ? React.createElement(icon.component, { size: 20, color: icon.color }) : null;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
                }}
                className="w-8 h-8 rounded-full"
              />
            </View>
            <Text className="text-2xl font-bold text-gray-800">Oopsly</Text>
          </View>

          <View className="flex-row items-center bg-orange-50 px-3 py-1 rounded-full">
            <Flame size={16} color="#EA580C" fill="#EA580C" />
            <Text className="ml-1 font-bold text-orange-700">7</Text>
          </View>
        </View>

        {/* Motivational Quote */}
        <View className="mt-4 p-4 bg-indigo-50 rounded-xl">
          <Text className="text-indigo-800 text-lg font-medium italic text-center">
            "The expert in anything was once a beginner."
          </Text>
          <Text className="text-indigo-600 text-sm text-center mt-1">
            - Helen Hayes
          </Text>
        </View>

        {/* Navigation Menu - Reordered with Create Shelf first */}
        <View className="flex-row justify-around mt-4 pt-3 border-t border-gray-100">
          <TouchableOpacity
            className="items-center"
            onPress={() => setModalVisible(true)}
          >
            <View className="bg-indigo-100 p-3 rounded-full mb-1">
              <PlusCircle size={24} color="#4F46E5" />
            </View>
            <Text className="text-xs text-gray-600">Create Shelf</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/tasks-list")}
          >
            <View className="bg-blue-100 p-3 rounded-full mb-1">
              <CheckSquare size={24} color="#3B82F6" />
            </View>
            <Text className="text-xs text-gray-600">Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/notes")}
          >
            <View className="bg-green-100 p-3 rounded-full mb-1">
              <StickyNote size={24} color="#10B981" />
            </View>
            <Text className="text-xs text-gray-600">Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/study-planner")}
          >
            <View className="bg-purple-100 p-3 rounded-full mb-1">
              <Calendar size={24} color="#8B5CF6" />
            </View>
            <Text className="text-xs text-gray-600">Planner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1">
        {Array.from(shelves ?? []).map((shelf) => (
          <View key={shelf.id} className="mb-6">
            <View className="flex-row items-center px-4 mb-3 mt-2">
              <View className="mr-2">{renderIconComponent(shelf.icon)}</View>

              <Text className="text-lg font-bold text-gray-800">
                {shelf.name}
              </Text>
            </View>

            {renderSubjectCards(shelf.subjects)}
          </View>
        ))}

        <View className="h-24" />
      </ScrollView>

      {/* Create Shelf Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setModalVisible(false)}
        >
          <Pressable 
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800">Create New Shelf</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4" style={{ maxHeight: 500 }}>
              {/* Icon Selector */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Icon</Text>
                <TouchableOpacity
                  className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
                  onPress={() => setShowIconPicker(!showIconPicker)}
                >
                  <View className="flex-row items-center">
                    {React.createElement(selectedIcon.component, {
                      size: 24,
                      color: selectedIcon.color,
                    })}
                    <Text className="text-gray-800 ml-3 font-medium">
                      {selectedIcon.name}
                    </Text>
                  </View>
                  <Text className="text-gray-400">Tap to change</Text>
                </TouchableOpacity>

                {/* Icon Picker Grid */}
                {showIconPicker && (
                  <View className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <View className="flex-row flex-wrap gap-2">
                      {availableIcons.map((icon, index) => (
                        <TouchableOpacity
                          key={index}
                          className={`p-3 rounded-lg ${
                            selectedIcon.name === icon.name
                              ? 'bg-indigo-100 border-2 border-indigo-500'
                              : 'bg-white border border-gray-200'
                          }`}
                          onPress={() => {
                            setSelectedIcon(icon);
                            setShowIconPicker(false);
                          }}
                        >
                          {React.createElement(icon.component, {
                            size: 24,
                            color: icon.color,
                          })}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf name"
                  placeholderTextColor="#9CA3AF"
                  value={shelfName}
                  onChangeText={setShelfName}
                />
              </View>

              {/* Description Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Description</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={shelfDescription}
                  onChangeText={setShelfDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                  onPress={handleCreateShelf}
                >
                  <Text className="text-white font-bold">Create Shelf</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default OopslyApp;