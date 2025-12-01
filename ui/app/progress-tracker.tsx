import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Flame,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  Circle,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const ProgressTrackerScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("daily");

  // Mock data
  const userData = {
    name: "Alex Johnson",
    streak: 12,
    todayStudyHours: 2.5,
    weeklyGoal: 10,
    weeklyCompleted: 7.5,
    monthlyGoal: 40,
    monthlyCompleted: 28,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8VXNlciUyMHByb2ZpbGUlMjBhdmF0YXJ8ZW58MHx8MHx8fDA%3D",
  };

  // Mock streak data for the past 30 days
  const streakHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
    completed: Math.random() > 0.3, // 70% chance of completion
  }));

  // Mock study sessions data
  const studySessions = [
    { id: 1, subject: "Data Structures", duration: 1.5, date: "Today, 10:30 AM" },
    { id: 2, subject: "Algorithms", duration: 1.0, date: "Yesterday, 3:45 PM" },
    { id: 3, subject: "System Design", duration: 2.0, date: "May 15, 9:15 AM" },
    { id: 4, subject: "Machine Learning", duration: 1.25, date: "May 14, 2:30 PM" },
  ];

  // Mock achievements
  const achievements = [
    { id: 1, title: "First Steps", description: "Reviewed 10 cards", unlocked: true, icon: "🎯" },
    { id: 2, title: "Consistent Learner", description: "7-day streak", unlocked: true, icon: "🔥" },
    { id: 3, title: "Knowledge Seeker", description: "Reviewed 100 cards", unlocked: true, icon: "📚" },
    { id: 4, title: "Mastermind", description: "Mastered 5 subjects", unlocked: false, icon: "🧠" },
    { id: 5, title: "Night Owl", description: "Study after 10 PM", unlocked: true, icon: "🦉" },
    { id: 6, title: "Early Bird", description: "Study before 7 AM", unlocked: false, icon: "🌅" },
  ];

  // Stats for different time periods
  const statsData = [
    { period: "Today", hours: 2.5, goal: 3, progress: 83 },
    { period: "This Week", hours: 7.5, goal: 10, progress: 75 },
    { period: "This Month", hours: 28, goal: 40, progress: 70 },
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
          <Text className="text-xl font-bold text-gray-800">Progress Tracker</Text>
          <View className="w-6" /> {/* Spacer for alignment */}
        </View>

        {/* Profile Info */}
        <View className="flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mr-4">
            <Image
              source={{ uri: userData.avatar }}
              className="w-16 h-16 rounded-full"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-800">{userData.name}</Text>
            <View className="flex-row items-center mt-1">
              <Flame size={16} color="#EA580C" fill="#EA580C" />
              <Text className="text-orange-700 font-medium ml-1">{userData.streak} day streak</Text>
            </View>
          </View>
          <View className="items-end">
            <View className="flex-row items-center">
              <Clock size={16} color="#6B7280" />
              <Text className="text-gray-700 font-medium ml-1">{userData.todayStudyHours}h</Text>
            </View>
            <Text className="text-gray-500 text-sm mt-1">Today</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-4 py-6">
        {/* Stats Overview */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Study Statistics</Text>
          <View className="flex-row justify-between">
            {statsData.map((stat, index) => (
              <View key={index} className="items-center basis-[30%]">
                <Text className="text-gray-500 text-sm">{stat.period}</Text>
                <Text className="text-2xl font-bold text-indigo-600 mt-1">{stat.hours}h</Text>
                <Text className="text-gray-500 text-xs mt-1">of {stat.goal}h</Text>
                <View className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <View 
                    className="bg-indigo-500 h-2 rounded-full" 
                    style={{ width: `${stat.progress}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white rounded-xl p-1 mb-6">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "daily" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("daily")}
          >
            <Text className={`font-medium ${
              activeTab === "daily" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "weekly" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("weekly")}
          >
            <Text className={`font-medium ${
              activeTab === "weekly" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === "monthly" ? "bg-indigo-100" : ""
            }`}
            onPress={() => setActiveTab("monthly")}
          >
            <Text className={`font-medium ${
              activeTab === "monthly" ? "text-indigo-600" : "text-gray-500"
            }`}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "daily" && (
          <>
            {/* Streak Calendar */}
            <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Streak Calendar</Text>
              <View className="flex-row flex-wrap gap-2">
                {streakHistory.map((day, index) => (
                  <View 
                    key={index} 
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      day.completed ? "bg-indigo-100" : "bg-gray-100"
                    }`}
                  >
                    {day.completed ? (
                      <CheckCircle size={24} color="#4F46E5" fill="#4F46E5" />
                    ) : (
                      <Circle size={20} color="#D1D5DB" />
                    )}
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-4">
                <Text className="text-gray-500 text-sm">30 days ago</Text>
                <Text className="text-gray-500 text-sm">Today</Text>
              </View>
            </View>

            {/* Recent Sessions */}
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-gray-800">Recent Sessions</Text>
                <TouchableOpacity>
                  <Text className="text-indigo-600 font-medium">See All</Text>
                </TouchableOpacity>
              </View>
              {studySessions.map((session) => (
                <View 
                  key={session.id} 
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <View className="bg-indigo-50 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <Clock size={20} color="#4F46E5" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-800">{session.subject}</Text>
                    <Text className="text-gray-500 text-sm">{session.date}</Text>
                  </View>
                  <Text className="font-medium text-gray-700">{session.duration}h</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === "weekly" && (
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Weekly Progress</Text>
            
            {/* Weekly Goal Progress */}
            <View className="mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="font-medium text-gray-700">Weekly Goal</Text>
                <Text className="font-medium text-indigo-600">{userData.weeklyCompleted}h / {userData.weeklyGoal}h</Text>
              </View>
              <View className="bg-gray-200 rounded-full h-4">
                <View 
                  className="bg-indigo-500 h-4 rounded-full" 
                  style={{ width: `${(userData.weeklyCompleted / userData.weeklyGoal) * 100}%` }}
                />
              </View>
            </View>
            
            {/* Weekly Chart Placeholder */}
            <View className="h-40 bg-indigo-50 rounded-xl items-center justify-center mb-6">
              <Text className="text-gray-500">Weekly Study Chart</Text>
            </View>
            
            {/* Weekly Comparison */}
            <View className="flex-row justify-between">
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mb-2">
                  <TrendingUp size={24} color="#4F46E5" />
                </View>
                <Text className="font-medium text-gray-700">This Week</Text>
                <Text className="text-indigo-600 font-bold">{userData.weeklyCompleted}h</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-2">
                  <Calendar size={24} color="#6B7280" />
                </View>
                <Text className="font-medium text-gray-700">Last Week</Text>
                <Text className="text-gray-600 font-bold">8.2h</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-2">
                  <Target size={24} color="#6B7280" />
                </View>
                <Text className="font-medium text-gray-700">Average</Text>
                <Text className="text-gray-600 font-bold">7.8h</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "monthly" && (
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Monthly Achievements</Text>
            
            {/* Monthly Goal Progress */}
            <View className="mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="font-medium text-gray-700">Monthly Goal</Text>
                <Text className="font-medium text-indigo-600">{userData.monthlyCompleted}h / {userData.monthlyGoal}h</Text>
              </View>
              <View className="bg-gray-200 rounded-full h-4">
                <View 
                  className="bg-indigo-500 h-4 rounded-full" 
                  style={{ width: `${(userData.monthlyCompleted / userData.monthlyGoal) * 100}%` }}
                />
              </View>
            </View>
            
            {/* Achievements Grid */}
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
                    <Text className="text-xl">{achievement.icon}</Text>
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
                  {!achievement.unlocked && (
                    <View className="mt-2 bg-gray-200 rounded-full px-2 py-1">
                      <Text className="text-gray-500 text-xs">Locked</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default ProgressTrackerScreen;