import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Calendar,
  BookOpen,
  TrendingUp,
  Target,
  Flame,
} from "lucide-react-native";
import { LineChart, BarChart, ProgressChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

// Mock data for charts
const studyTrendData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      data: [12, 19, 15, 8, 22, 30, 18],
      strokeWidth: 2,
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    },
  ],
};

const subjectPerformanceData = {
  labels: ["CS", "Lang", "Sci", "Hist"],
  datasets: [
    {
      data: [85, 72, 90, 65],
      colors: [
        (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
      ],
    },
  ],
};

const retentionRateData = [0.75, 0.82, 0.68]; // Percentage values

const StatisticsScreen = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState("week");

  // Chart configuration
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#6366F1",
    },
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="p-2 -ml-2"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800 ml-2">
            Statistics
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Time Range Selector */}
        <View className="flex-row justify-end mb-6">
          <View className="flex-row bg-gray-100 rounded-full p-1">
            {["day", "week", "month"].map((range) => (
              <TouchableOpacity
                key={range}
                className={`px-4 py-1 rounded-full ${
                  timeRange === range ? "bg-white shadow-sm" : ""
                }`}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  className={`text-sm font-medium ${
                    timeRange === range ? "text-indigo-600" : "text-gray-500"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Study Trends Card */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <TrendingUp size={20} color="#6366F1" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Study Trends
            </Text>
          </View>
          <Text className="text-gray-500 text-sm mb-4">
            Cards reviewed per day
          </Text>
          <LineChart
            data={studyTrendData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Retention Rates Card */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Target size={20} color="#10B981" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Retention Rates
            </Text>
          </View>
          <Text className="text-gray-500 text-sm mb-4">
            Based on spaced repetition performance
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <ProgressChart
                data={{
                  labels: [""],
                  data: [retentionRateData[0]],
                }}
                width={100}
                height={100}
                chartConfig={{
                  ...chartConfig,
                  color: () => `rgba(99, 102, 241, 1)`,
                }}
                hideLegend={true}
              />
              <Text className="text-gray-700 font-medium mt-2">1 Day</Text>
              <Text className="text-gray-500 text-sm">
                {(retentionRateData[0] * 100).toFixed(0)}%
              </Text>
            </View>
            <View className="items-center">
              <ProgressChart
                data={{
                  labels: [""],
                  data: [retentionRateData[1]],
                }}
                width={100}
                height={100}
                chartConfig={{
                  ...chartConfig,
                  color: () => `rgba(16, 185, 129, 1)`,
                }}
                hideLegend={true}
              />
              <Text className="text-gray-700 font-medium mt-2">7 Days</Text>
              <Text className="text-gray-500 text-sm">
                {(retentionRateData[1] * 100).toFixed(0)}%
              </Text>
            </View>
            <View className="items-center">
              <ProgressChart
                data={{
                  labels: [""],
                  data: [retentionRateData[2]],
                }}
                width={100}
                height={100}
                chartConfig={{
                  ...chartConfig,
                  color: () => `rgba(139, 92, 246, 1)`,
                }}
                hideLegend={true}
              />
              <Text className="text-gray-700 font-medium mt-2">30 Days</Text>
              <Text className="text-gray-500 text-sm">
                {(retentionRateData[2] * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Subject Performance Card */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <BookOpen size={20} color="#8B5CF6" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Subject Performance
            </Text>
          </View>
          <Text className="text-gray-500 text-sm mb-4">
            Mastery level by subject
          </Text>
          <BarChart
            data={subjectPerformanceData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            yAxisLabel="%"
          />
        </View>

        {/* Streak Analytics Card */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Flame size={20} color="#F59E0B" fill="#F59E0B" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Streak Analytics
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-3xl font-bold text-gray-800">12</Text>
              <Text className="text-gray-500">Current Streak</Text>
            </View>
            <View className="h-16 w-0.5 bg-gray-200 mx-4" />
            <View>
              <Text className="text-3xl font-bold text-gray-800">37</Text>
              <Text className="text-gray-500">Longest Streak</Text>
            </View>
            <View className="h-16 w-0.5 bg-gray-200 mx-4" />
            <View>
              <Text className="text-3xl font-bold text-gray-800">89%</Text>
              <Text className="text-gray-500">Completion</Text>
            </View>
          </View>
        </View>

        {/* Weekly Goal Card */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color="#EF4444" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Weekly Goal
            </Text>
          </View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-700">45 of 60 cards</Text>
            <Text className="text-gray-500">75%</Text>
          </View>
          <View className="bg-gray-200 rounded-full h-3">
            <View
              className="bg-indigo-500 rounded-full h-3"
              style={{ width: "75%" }}
            />
          </View>
          <Text className="text-gray-500 text-sm mt-3">
            15 cards left to reach your weekly goal
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  chart: {
    borderRadius: 12,
    marginLeft: -10,
  },
});

export default StatisticsScreen;