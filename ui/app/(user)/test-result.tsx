import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { ChevronRight, TrendingUp, Award, Target, Calendar, BookOpen } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Mock data for test history
const mockTestHistory = [
  { id: '1', title: 'Algebra Fundamentals', subject: 'Mathematics', date: '2023-05-15', score: 85, total: 100 },
  { id: '2', title: 'World War II', subject: 'History', date: '2023-05-10', score: 92, total: 100 },
  { id: '3', title: 'Chemical Reactions', subject: 'Chemistry', date: '2023-05-05', score: 78, total: 100 },
  { id: '4', title: 'Shakespeare Literature', subject: 'English', date: '2023-04-28', score: 88, total: 100 },
  { id: '5', title: 'Cell Biology', subject: 'Biology', date: '2023-04-20', score: 95, total: 100 },
];

// Mock data for score trends
const scoreTrendData = [
  { value: 70, label: 'Apr' },
  { value: 75, label: 'May' },
  { value: 82, label: 'Jun' },
  { value: 88, label: 'Jul' },
  { value: 92, label: 'Aug' },
  { value: 85, label: 'Sep' },
];

// Mock data for subject breakdown
const subjectBreakdownData = [
  { value: 90, label: 'Math' },
  { value: 85, label: 'Science' },
  { value: 92, label: 'History' },
  { value: 88, label: 'English' },
];

// Mock improvement suggestions
const improvementSuggestions = [
  { id: '1', title: 'Focus on Chemistry', description: 'Your scores in Chemistry have been consistently lower than other subjects', progress: 30 },
  { id: '2', title: 'Practice Algebra', description: 'Algebra fundamentals need more practice for better performance', progress: 65 },
  { id: '3', title: 'Time Management', description: 'Improve your test-taking speed to increase accuracy', progress: 45 },
];

const TestResultsDashboard = () => {
  const [timeRange, setTimeRange] = useState('6m'); // 6 months

  // Calculate overall performance metrics
  const calculateAverageScore = () => {
    const total = mockTestHistory.reduce((sum, test) => sum + test.score, 0);
    return Math.round(total / mockTestHistory.length);
  };

  const calculateBestSubject = () => {
    const subjectScores: Record<string, number[]> = {};
    
    mockTestHistory.forEach(test => {
      if (!subjectScores[test.subject]) {
        subjectScores[test.subject] = [];
      }
      subjectScores[test.subject].push(test.score);
    });
    
    let bestSubject = '';
    let bestAverage = 0;
    
    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (average > bestAverage) {
        bestAverage = average;
        bestSubject = subject;
      }
    });
    
    return { subject: bestSubject, average: Math.round(bestAverage) };
  };

  const averageScore = calculateAverageScore();
  const bestSubject = calculateBestSubject();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-800">Test Results Dashboard</Text>
        <Text className="text-gray-500 mt-1">Track your academic progress and performance</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Performance Overview */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">Performance Overview</Text>
            <View className="flex-row bg-gray-100 rounded-lg p-1">
              {['1m', '3m', '6m', '1y'].map((range) => (
                <TouchableOpacity
                  key={range}
                  className={`px-3 py-1 rounded-md ${timeRange === range ? 'bg-blue-500' : ''}`}
                  onPress={() => setTimeRange(range)}
                >
                  <Text className={`text-sm ${timeRange === range ? 'text-white' : 'text-gray-600'}`}>
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row justify-between mb-4">
            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-2">
                <TrendingUp size={32} color="#3B82F6" />
              </View>
              <Text className="text-gray-500 text-sm">Average Score</Text>
              <Text className="text-xl font-bold text-gray-800">{averageScore}%</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-2">
                <Award size={32} color="#10B981" />
              </View>
              <Text className="text-gray-500 text-sm">Best Subject</Text>
              <Text className="text-xl font-bold text-gray-800">{bestSubject.subject}</Text>
              <Text className="text-sm text-gray-500">{bestSubject.average}%</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-2">
                <Target size={32} color="#8B5CF6" />
              </View>
              <Text className="text-gray-500 text-sm">Tests Taken</Text>
              <Text className="text-xl font-bold text-gray-800">{mockTestHistory.length}</Text>
            </View>
          </View>
        </View>

        {/* Score Trends Chart */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">Score Trends</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 font-medium">View Details</Text>
            </TouchableOpacity>
          </View>
          
          <View className="items-center">
            <LineChart
              data={scoreTrendData}
              width={width - 60}
              height={200}
              spacing={40}
              thickness={3}
              color="#3B82F6"
              startFillColor="rgba(59, 130, 246, 0.3)"
              endFillColor="rgba(59, 130, 246, 0.1)"
              startOpacity={0.9}
              endOpacity={0.2}
              initialSpacing={0}
              noOfSections={4}
              maxValue={100}
              yAxisThickness={0}
              xAxisThickness={1}
              hideRules
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: '#6B7280' }}
              labelWidth={30}
              xAxisLabelTextStyle={{ color: '#6B7280' }}
              curved
              isAnimated
            />
          </View>
        </View>

        {/* Subject Breakdown */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">Subject Breakdown</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          
          <View className="items-center mb-4">
            <BarChart
              data={subjectBreakdownData.map((item, index) => ({
                value: item.value,
                label: item.label,
                frontColor: index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : index === 2 ? '#8B5CF6' : '#F59E0B',
              }))}
              width={width - 60}
              height={200}
              spacing={40}
              barWidth={24}
              initialSpacing={10}
              noOfSections={4}
              maxValue={100}
              yAxisThickness={0}
              xAxisThickness={1}
              hideRules
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: '#6B7280' }}
              labelWidth={30}
              xAxisLabelTextStyle={{ color: '#6B7280' }}
              isAnimated
            />
          </View>
        </View>

        {/* Recent Tests */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">Recent Tests</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          
          {mockTestHistory.map((test) => (
            <TouchableOpacity 
              key={test.id} 
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <View className="bg-blue-50 p-3 rounded-lg mr-3">
                <BookOpen size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">{test.title}</Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-gray-500 text-sm">{test.subject}</Text>
                  <Text className="text-gray-300 mx-2">•</Text>
                  <Text className="text-gray-500 text-sm">{test.date}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="font-bold text-gray-800">{test.score}%</Text>
                <Text className="text-gray-500 text-sm">{test.score}/{test.total}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" className="ml-2" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Improvement Suggestions */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">Improvement Suggestions</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 font-medium">See All</Text>
            </TouchableOpacity>
          </View>
          
          {improvementSuggestions.map((suggestion) => (
            <View key={suggestion.id} className="py-3 border-b border-gray-100">
              <Text className="font-semibold text-gray-800">{suggestion.title}</Text>
              <Text className="text-gray-500 text-sm mt-1">{suggestion.description}</Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                  <View 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: `${suggestion.progress}%` }}
                  />
                </View>
                <Text className="text-gray-500 text-sm">{suggestion.progress}%</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default TestResultsDashboard;