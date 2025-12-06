import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Plus, Edit3, CheckCircle, Circle, Trash2, Search, Filter, Target, Link, Calendar, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  targetDate?: string;
  linkedTaskIds: string[];
  progress: number; // 0-100%
}

const GoalTrackerScreen = () => {
  const router = useRouter();
  
  // Mock tasks data (same as in tasks-list.tsx)
  const [tasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Complete Algebra Exercises',
      description: 'Finish exercises 1-20 on page 45',
      completed: false,
      category: 'Math',
      dueDate: '2023-06-15',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Read Chapter 5',
      description: 'World War II events',
      completed: true,
      category: 'History',
      dueDate: '2023-06-10',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Write Essay Draft',
      description: 'First draft of persuasive essay',
      completed: false,
      category: 'Language',
      dueDate: '2023-06-18',
      priority: 'high'
    },
    {
      id: '4',
      title: 'Chemistry Lab Report',
      description: 'Complete lab report for experiment 3',
      completed: false,
      category: 'Science',
      dueDate: '2023-06-12',
      priority: 'medium'
    },
  ]);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: 'g1',
      title: 'Improve Math Grade',
      description: 'Achieve at least 85% in upcoming math exam',
      completed: false,
      targetDate: '2023-07-15',
      linkedTaskIds: ['1', '4'],
      progress: 25
    },
    {
      id: 'g2',
      title: 'Complete Summer Reading',
      description: 'Finish reading all assigned books for English class',
      completed: false,
      targetDate: '2023-08-20',
      linkedTaskIds: ['2'],
      progress: 50
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
  });
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [linkingMode, setLinkingMode] = useState(false);

  const filteredGoals = goals.filter(goal => 
    goal.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    goal.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleGoalCompletion = (id: string) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, completed: !goal.completed } : goal
    ));
  };

  const deleteGoal = (id: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setGoals(goals.filter(goal => goal.id !== id)) }
      ]
    );
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setNewGoal({
      title: '',
      description: '',
      targetDate: '',
    });
    setSelectedTaskIds([]);
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate || '',
    });
    setSelectedTaskIds(goal.linkedTaskIds);
    setModalVisible(true);
  };

  const saveGoal = () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Validation Error', 'Goal title is required');
      return;
    }

    if (editingGoal) {
      // Update existing goal
      setGoals(goals.map(goal => 
        goal.id === editingGoal.id 
        ? { 
            ...goal, 
            title: newGoal.title,
            description: newGoal.description,
            targetDate: newGoal.targetDate,
            linkedTaskIds: selectedTaskIds
          } 
        : goal
      ));
    } else {
      // Add new goal
      const goal: Goal = {
        id: `g${Date.now()}`,
        title: newGoal.title,
        description: newGoal.description,
        completed: false,
        targetDate: newGoal.targetDate,
        linkedTaskIds: selectedTaskIds,
        progress: 0
      };
      setGoals([...goals, goal]);
    }

    setModalVisible(false);
  };

  const toggleTaskSelection = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateProgress = (linkedTaskIds: string[]) => {
    if (linkedTaskIds.length === 0) return 0;
    const linkedTasks = tasks.filter(task => linkedTaskIds.includes(task.id));
    const completedTasks = linkedTasks.filter(task => task.completed);
    return Math.round((completedTasks.length / linkedTasks.length) * 100);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-4 px-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-2xl font-bold">Goal Tracker</Text>
          <TouchableOpacity 
            className="bg-white/20 p-2 rounded-full"
            onPress={() => router.push('/')}
          >
            <Target color="white" size={24} />
          </TouchableOpacity>
        </View>
        <Text className="text-white/90 mt-2">
          Set goals and link tasks to track your progress
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-4">
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-3 shadow-sm">
          <Search color="#6b7280" size={20} />
          <TextInput
            className="flex-1 ml-2 text-gray-700"
            placeholder="Search goals..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Goals List */}
      <FlatList
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        renderItem={({ item }) => {
          const progress = calculateProgress(item.linkedTaskIds);
          const linkedTasks = tasks.filter(task => item.linkedTaskIds.includes(task.id));
          
          return (
            <View className={`bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 ${item.completed ? 'border-green-500' : 'border-blue-500'}`}>
              <View className="flex-row justify-between items-start">
                <TouchableOpacity 
                  className="mr-3"
                  onPress={() => toggleGoalCompletion(item.id)}
                >
                  {item.completed ? (
                    <CheckCircle color="#10B981" size={24} fill="#10B981" />
                  ) : (
                    <Circle color="#ccc" size={24} />
                  )}
                </TouchableOpacity>

                <View className="flex-1">
                  <View className="flex-row justify-between">
                    <Text className={`text-lg font-semibold ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {item.title}
                    </Text>
                    <TouchableOpacity onPress={() => openEditModal(item)}>
                      <Edit3 color="#6b7280" size={20} />
                    </TouchableOpacity>
                  </View>

                  {item.description ? (
                    <Text className={`mt-1 ${item.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.targetDate && (
                    <View className="flex-row items-center mt-2">
                      <Calendar color="#6b7280" size={16} />
                      <Text className="ml-2 text-gray-500 text-sm">
                        Target: {formatDate(item.targetDate)}
                      </Text>
                    </View>
                  )}

                  {/* Progress Bar */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-gray-600">Progress</Text>
                      <Text className="text-sm text-gray-600">{progress}%</Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2">
                      <View 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </View>
                  </View>

                  {/* Linked Tasks Summary */}
                  <View className="mt-2">
                    <TouchableOpacity 
                      className="flex-row items-center"
                      onPress={() => {
                        setEditingGoal(item);
                        setSelectedTaskIds(item.linkedTaskIds);
                        setLinkingMode(true);
                        setModalVisible(true);
                      }}
                    >
                      <Link color="#6b7280" size={16} />
                      <Text className="ml-1 text-gray-600 text-sm">
                        {linkedTasks.length} linked task{linkedTasks.length !== 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  className="ml-2"
                  onPress={() => deleteGoal(item.id)}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            <Target color="#9CA3AF" size={48} />
            <Text className="text-gray-500 text-lg mt-4">No goals yet</Text>
            <Text className="text-gray-400 mt-2">Create your first goal to get started</Text>
            <TouchableOpacity 
              className="mt-4 bg-blue-500 py-2 px-6 rounded-full"
              onPress={openAddModal}
            >
              <Text className="text-white font-medium">Add Goal</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-blue-500 rounded-full p-4 shadow-lg"
        onPress={openAddModal}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      {/* Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-3/4">
            <Text className="text-xl font-bold mb-4 text-gray-800">
              {editingGoal ? 'Edit Goal' : 'Add New Goal'}
            </Text>

            {!linkingMode ? (
              <ScrollView>
                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Goal Title *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="What do you want to achieve?"
                    value={newGoal.title}
                    onChangeText={(text) => setNewGoal({...newGoal, title: text})}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Description</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="Describe your goal"
                    value={newGoal.description}
                    onChangeText={(text) => setNewGoal({...newGoal, description: text})}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-700 mb-2 font-medium">Target Date</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="YYYY-MM-DD"
                    value={newGoal.targetDate}
                    onChangeText={(text) => setNewGoal({...newGoal, targetDate: text})}
                  />
                </View>

                <TouchableOpacity
                  className="flex-row items-center justify-center bg-blue-50 py-3 rounded-lg mb-6"
                  onPress={() => setLinkingMode(true)}
                >
                  <Link color="#3B82F6" size={20} />
                  <Text className="text-blue-600 font-medium ml-2">
                    {selectedTaskIds.length > 0 
                      ? `${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''} linked` 
                      : 'Link Tasks to Goal'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View className="flex-1">
                <Text className="text-gray-700 mb-4 font-medium">Select tasks to link to this goal:</Text>
                
                <FlatList
                  data={tasks}
                  keyExtractor={(item) => item.id}
                  className="flex-1"
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      className={`flex-row items-center p-3 mb-2 rounded-lg ${selectedTaskIds.includes(item.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                      onPress={() => toggleTaskSelection(item.id)}
                    >
                      {selectedTaskIds.includes(item.id) ? (
                        <CheckCircle color="#3B82F6" size={20} fill="#3B82F6" />
                      ) : (
                        <Circle color="#ccc" size={20} />
                      )}
                      <View className="ml-3 flex-1">
                        <Text className={`font-medium ${selectedTaskIds.includes(item.id) ? 'text-blue-700' : 'text-gray-800'}`}>
                          {item.title}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {item.category} • {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View className="flex-1 justify-center items-center py-8">
                      <Text className="text-gray-500">No tasks available</Text>
                    </View>
                  }
                />
              </View>
            )}

            <View className="flex-row gap-3 mt-4">
              {linkingMode ? (
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
                  onPress={() => setLinkingMode(false)}
                >
                  <Text className="text-gray-700 font-medium">Back to Details</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
                    onPress={() => setModalVisible(false)}
                  >
                    <Text className="text-gray-700 font-medium">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-blue-500 rounded-lg py-3 items-center"
                    onPress={saveGoal}
                  >
                    <Text className="text-white font-medium">
                      {editingGoal ? 'Update' : 'Add'} Goal
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GoalTrackerScreen;