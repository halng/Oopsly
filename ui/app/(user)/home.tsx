import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
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

  // Render subject cards horizontally
  // const renderSubjectCards = (subjects) => {
  //   return (
  //     <ScrollView
  //       horizontal
  //       showsHorizontalScrollIndicator={false}
  //       className="max-h-40"
  //     >
  //       <View className="flex-row gap-4 px-4 pb-2">
  //         {subjects.map((subject) => (
  //           <TouchableOpacity
  //             key={subject.id}
  //             className="bg-white rounded-xl p-4 w-60 shadow-sm border border-gray-100"
  //             onPress={() => router.push(`/subject/${subject.id}`)}
  //           >
  //             <View className="flex-row justify-between items-start mb-2">
  //               <Text className="font-bold text-gray-800 text-lg">
  //                 {subject.name}
  //               </Text>
  //               <View className="bg-blue-50 rounded-full px-2 py-1">
  //                 <Text className="text-blue-600 text-xs font-semibold">
  //                   {subject.dueCount} due
  //                 </Text>
  //               </View>
  //             </View>

  //             <View className="mt-2">
  //               <View className="flex-row items-center">
  //                 <View className="flex-1 bg-gray-200 rounded-full h-2">
  //                   <View
  //                     className="bg-blue-500 h-2 rounded-full"
  //                     style={{
  //                       width: `${((subject.totalCount - subject.dueCount) / subject.totalCount) * 100}%`,
  //                     }}
  //                   />
  //                 </View>
  //                 <Text className="text-gray-500 text-xs ml-2">
  //                   {subject.totalCount - subject.dueCount}/{subject.totalCount}
  //                 </Text>
  //               </View>
  //             </View>

  //             {/* Dedicated Test Creation Button */}
  //             <TouchableOpacity
  //               className="mt-3 bg-indigo-50 rounded-lg py-2 flex-row items-center justify-center"
  //               onPress={() => router.push(`/manual-creation`)}
  //             >
  //               <PlusCircle size={16} color="#4F46E5" />
  //               <Text className="text-indigo-600 text-sm font-medium ml-1">
  //                 Create Test
  //               </Text>
  //             </TouchableOpacity>
  //           </TouchableOpacity>
  //         ))}
  //       </View>
  //     </ScrollView>
  //   );
  // };

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

        {/* Navigation Menu */}
        <View className="flex-row justify-around mt-4 pt-3 border-t border-gray-100">
          <TouchableOpacity
            testID="quick-action-tasks"
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
            testID="quick-action-notes"
            onPress={() => router.push("/notes")}
          >
            <View className="bg-green-100 p-3 rounded-full mb-1">
              <StickyNote size={24} color="#10B981" />
            </View>
            <Text className="text-xs text-gray-600">Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            testID="quick-action-planner"
            onPress={() => router.push("/study-planner")}
          >
            <View className="bg-purple-100 p-3 rounded-full mb-1">
              <Calendar size={24} color="#8B5CF6" />
            </View>
            <Text className="text-xs text-gray-600">Planner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            testID="quick-action-create-test"
          >
            <View className="bg-indigo-100 p-3 rounded-full mb-1">
              <PlusCircle size={24} color="#4F46E5" />
            </View>
            <Text className="text-xs text-gray-600">Create Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1" testID="main-scroll-view">
        {dummyData.map((shelf) => (
          <View key={shelf.id} className="mb-6">
            <View className="flex-row items-center px-4 mb-3 mt-2">
              <View className="mr-2">{shelf.icon}</View>
              <Text className="text-lg font-bold text-gray-800" testID={`shelf-name-${shelf.id}`}>
                {shelf.name}
              </Text>
            </View>

            {renderSubjectCards(shelf.subjects)}
          </View>
        ))}

        <View className="h-24" />
      </ScrollView>
    </View>
  );
};

export default OsmosisApp;
