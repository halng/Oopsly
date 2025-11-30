import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Plus,
  Flame,
  ChevronLeft,
  BookOpen,
  Brain,
  Lightbulb,
  FileText,
  Languages,
  Code,
  Database,
  Globe,
  Music,
  Palette,
} from "lucide-react-native";

// Dummy data for shelves and subjects
const dummyData = [
  {
    id: "1",
    name: "Computer Science",
    icon: <Code size={20} color="#4F46E5" />,
    subjects: [
      { id: "1-1", name: "Data Structures", dueCount: 12, totalCount: 45 },
      { id: "1-2", name: "Algorithms", dueCount: 8, totalCount: 32 },
      { id: "1-3", name: "System Design", dueCount: 5, totalCount: 28 },
      { id: "1-4", name: "Machine Learning", dueCount: 15, totalCount: 60 },
    ],
  },
  {
    id: "2",
    name: "Languages",
    icon: <Languages size={20} color="#10B981" />,
    subjects: [
      { id: "2-1", name: "Japanese Kanji N5", dueCount: 22, totalCount: 120 },
      { id: "2-2", name: "Spanish Vocabulary", dueCount: 7, totalCount: 85 },
      { id: "2-3", name: "French Grammar", dueCount: 3, totalCount: 50 },
    ],
  },
  {
    id: "3",
    name: "Liberal Arts",
    icon: <BookOpen size={20} color="#EF4444" />,
    subjects: [
      { id: "3-1", name: "World History", dueCount: 18, totalCount: 95 },
      { id: "3-2", name: "Philosophy", dueCount: 9, totalCount: 42 },
      { id: "3-3", name: "Art History", dueCount: 6, totalCount: 38 },
    ],
  },
  {
    id: "4",
    name: "Sciences",
    icon: <Database size={20} color="#8B5CF6" />,
    subjects: [
      { id: "4-1", name: "Organic Chemistry", dueCount: 25, totalCount: 110 },
      { id: "4-2", name: "Biology Fundamentals", dueCount: 14, totalCount: 75 },
      { id: "4-3", name: "Physics Concepts", dueCount: 11, totalCount: 68 },
    ],
  },
];

const OsmosisApp = () => {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));

  // Toggle FAB menu
  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);

    Animated.timing(fabAnimation, {
      toValue,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  // Render subject cards horizontally
  const renderSubjectCards = (subjects) => {
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
                    {subject.dueCount} due
                  </Text>
                </View>
              </View>

              <View className="mt-2">
                <View className="flex-row items-center">
                  <View className="flex-1 bg-gray-200 rounded-full h-2">
                    <View
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${((subject.totalCount - subject.dueCount) / subject.totalCount) * 100}%`,
                      }}
                    />
                  </View>
                  <Text className="text-gray-500 text-xs ml-2">
                    {subject.totalCount - subject.dueCount}/{subject.totalCount}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Calculate rotation for FAB items
  const fabRotation = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Calculate positions for FAB items
  const fabItem1Position = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const fabItem2Position = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -130],
  });

  const fabItem3Position = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -190],
  });

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
            <Text className="text-2xl font-bold text-gray-800">Osmosis</Text>
          </View>

          <View className="flex-row items-center bg-orange-50 px-3 py-1 rounded-full">
            <View className="flex-row items-center bg-orange-50 px-3 py-1 rounded-full">
                <Flame size={16} color="#EA580C" fill="#EA580C" />
                <Text className="ml-1 font-bold text-orange-700">7</Text>
            </View>
          </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1">
        {dummyData.map((shelf) => (
          <View key={shelf.id} className="mb-6">
            <View className="flex-row items-center px-4 mb-3 mt-2">
              <View className="mr-2">{shelf.icon}</View>
              <Text className="text-lg font-bold text-gray-800">
                {shelf.name}
              </Text>
            </View>

            {renderSubjectCards(shelf.subjects)}
          </View>
        ))}

        <View className="h-24" />
      </ScrollView>

      {/* Smart FAB */}
      <View className="absolute bottom-6 right-6">
        {/* FAB Items */}
        <Animated.View
          className="absolute right-0 bottom-0 mb-16 mr-4"
          style={{ transform: [{ translateY: fabItem1Position }] }}
        >
          <View
            className={`flex-row items-center ${fabOpen ? "opacity-100" : "opacity-0"}`}
          >
            <View className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <Text className="text-gray-700 text-sm">Upload Document</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center ml-3">
              <FileText size={20} color="white" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          className="absolute right-0 bottom-0 mb-16 mr-4"
          style={{ transform: [{ translateY: fabItem2Position }] }}
        >
          <View
            className={`flex-row items-center ${fabOpen ? "opacity-100" : "opacity-0"}`}
          >
            <View className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <Text className="text-gray-700 text-sm">Generate from Topic</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center ml-3">
              <Lightbulb size={20} color="white" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          className="absolute right-0 bottom-0 mb-16 mr-4"
          style={{ transform: [{ translateY: fabItem3Position }] }}
        >
          <View
            className={`flex-row items-center ${fabOpen ? "opacity-100" : "opacity-0"}`}
          >
            <View className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <Text className="text-gray-700 text-sm">Create Manually</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-amber-500 items-center justify-center ml-3">
              <Brain size={20} color="white" />
            </View>
          </View>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity
          className="w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
          onPress={toggleFab}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Plus size={24} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );
};

export default OsmosisApp;
