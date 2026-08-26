import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Calendar,
  Flame,
  BookOpen,
  Award,
  Settings,
  Edit3,
  Star,
  CheckCircle,
  TrendingUp,
} from "lucide-react-native";

const UserProfileScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock user data
  const userData = {
    name: "Alex Johnson",
    joinDate: "Jan 2023",
    streak: 12,
    totalStudyTime: 42,
    subjectsMastered: 8,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8VXNlciUyMHByb2ZpbGUlMjBhdmF0YXJ8ZW58MHx8MHx8fDA%3D",
  };

  // Mock statistics data
  const statsData = [
    { label: "Cards Reviewed", value: "1,248" },
    { label: "Subjects", value: "12" },
    { label: "Accuracy", value: "87%" },
    { label: "Study Time", value: "42h" },
  ];

  // Mock streak data
  const streakData = [
    { day: "Mon", active: true },
    { day: "Tue", active: true },
    { day: "Wed", active: true },
    { day: "Thu", active: false },
    { day: "Fri", active: true },
    { day: "Sat", active: true },
    { day: "Sun", active: true },
  ];

  // Mock achievements
  const achievements = [
    { id: 1, title: "First Steps", description: "Reviewed 10 cards", unlocked: true },
    { id: 2, title: "Consistent Learner", description: "7-day streak", unlocked: true },
    { id: 3, title: "Knowledge Seeker", description: "Reviewed 100 cards", unlocked: true },
    { id: 4, title: "Mastermind", description: "Mastered 5 subjects", unlocked: false },
    { id: 5, title: "Night Owl", description: "Study after 10 PM", unlocked: true },
    { id: 6, title: "Early Bird", description: "Study before 7 AM", unlocked: false },
  ];

  // Account settings options
  const settingsOptions = [
    { id: 1, title: "Account Settings", icon: <Settings size={20} color="#4F46E5" /> },
    { id: 2, title: "Notifications", icon: <BookOpen size={20} color="#4F46E5" /> },
    { id: 3, title: "Privacy", icon: <Award size={20} color="#4F46E5" /> },
    { id: 4, title: "Subscription", icon: <TrendingUp size={20} color="#4F46E5" /> },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4F46E5" />
            <Text className="text-indigo-600 font-medium ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Profile</Text>
          <TouchableOpacity>
            <Edit3 size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View className="items-center">
          <View className="w-24 h-24 rounded-full bg-indigo-100 items-center justify-center mb-4">
            <Image
              source={{ uri: userData.avatar }}
              className="w-24 h-24 rounded-full"
            />
          </View>
          <Text className="text-2xl font-bold text-gray-800">{userData.name}</Text>
          <View className="flex-row items-center mt-1">
            <Calendar size={16} color="#6B7280" />
            <Text className="text-gray-500 ml-1">Joined {userData.joinDate}</Text>
          </View>
          
          <View className="flex-row items-center bg-orange-50 px-4 py-2 rounded-full mt-4">
            <Flame size={20} color="#EA580C" fill="#EA580C" />
            <Text className="ml-2 font-bold text-orange-700 text-lg">{userData.streak} day streak</Text>
          </View>
        </View>
      </View>

      {/* Stats Overview */}
      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row justify-between mb-6">
          {statsData.map((stat, index) => (
            <View key={index} className="bg-white rounded-xl p-4 items-center shadow-sm flex-1 mx-1">
              <Text className="text-gray-500 text-sm">{stat.label}</Text>
              <Text className="text-2xl font-bold text-indigo-600 mt-1">{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white rounded-xl p-1 mb-6">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "overview" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("overview")}
          >
            <Text className={`font-medium ${
              activeTab === "overview" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "achievements" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("achievements")}
          >
            <Text className={`font-medium ${
              activeTab === "achievements" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Achievements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "settings" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("settings")}
          >
            <Text className={`font-medium ${
              activeTab === "settings" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            {/* Weekly Streak */}
            <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Weekly Activity</Text>
              <View className="flex-row justify-between">
                {streakData.map((day, index) => (
                  <View key={index} className="items-center">
                    <Text className="text-gray-500 mb-2">{day.day}</Text>
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      day.active ? "bg-indigo-100" : "bg-gray-100"
                    }`}>
                      {day.active ? (
                        <CheckCircle size={24} color="#4F46E5" fill="#4F46E5" />
                      ) : (
                        <View className="w-5 h-5 rounded-full bg-gray-300" />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Subjects Mastered */}
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Progress</Text>
              <View className="flex-row items-center mb-3">
                <BookOpen size={20} color="#4F46E5" />
                <Text className="text-gray-700 ml-2 flex-1">Subjects Mastered</Text>
                <Text className="text-gray-900 font-medium">{userData.subjectsMastered}/15</Text>
              </View>
              <View className="bg-gray-200 rounded-full h-3">
                <View 
                  className="bg-indigo-500 h-3 rounded-full" 
                  style={{ width: `${(userData.subjectsMastered / 15) * 100}%` }}
                />
              </View>
            </View>
          </>
        )}

        {activeTab === "achievements" && (
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Achievements</Text>
            <View className="flex-row flex-wrap gap-4">
              {achievements.map((achievement) => (
                <View 
                  key={achievement.id} 
                  className={`basis-[45%] rounded-xl p-4 items-center ${
                    achievement.unlocked ? "bg-indigo-50 border border-indigo-100" : "bg-gray-100"
                  }`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${
                    achievement.unlocked ? "bg-indigo-100" : "bg-gray-200"
                  }`}>
                    <Star 
                      size={24} 
                      color={achievement.unlocked ? "#4F46E5" : "#9CA3AF"} 
                      fill={achievement.unlocked ? "#4F46E5" : "none"} 
                    />
                  </View>
                  <Text className={`font-bold text-center mb-1 ${
                    achievement.unlocked ? "text-gray-800" : "text-gray-400"
                  }`}>
                    {achievement.title}
                  </Text>
                  <Text className={`text-center text-xs ${
                    achievement.unlocked ? "text-gray-600" : "text-gray-400"
                  }`}>
                    {achievement.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "settings" && (
          <View className="bg-white rounded-xl shadow-sm">
            {settingsOptions.map((option, index) => (
              <Pressable 
                key={option.id} 
                className={`flex-row items-center p-4 ${
                  index !== settingsOptions.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="mr-3">
                  {option.icon}
                </View>
                <Text className="text-gray-800 flex-1 font-medium">{option.title}</Text>
                <ChevronLeft size={20} color="#9CA3AF" className="rotate-180" />
              </Pressable>
            ))}
          </View>
        )}

        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default UserProfileScreen;