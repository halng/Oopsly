import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { 
  Plus, 
  Edit3, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Calendar, 
  Check, 
  Clock, 
  Target, 
  ChevronLeft,
  Link
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
}

const GoalDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalId = params.id as string;
  
  // Mock tasks data
  const [tasks, setTasks] = useState<Task[]>([
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

  // Mock timeline events
  const [timelineEvents] = useState<TimelineEvent[]>([
    {
      id: 't1',
      title: 'Goal Created',
      date: '2023-06-01',
      description: 'Set goal to improve math grade'
    },
    {
      id: 't2',
      title: 'First Task Linked',
      date: '2023-06-02',
      description: 'Linked algebra exercises to goal'
    },
    {
      id: 't3',
      title: 'Milestone Reached',
      date: '2023-06-10',
      description: 'Completed history reading task'
    },
    {
      id: 't4',
      title: 'Deadline Extended',
      date: '2023-06-15',
      description: 'Extended deadline to 2023-07-15'
    }
  ]);

  // Mock goal data
  const [goal] = useState({
    id: 'g1',
    title: 'Improve Math Grade',
    description: 'Achieve at least 85% in upcoming math exam',
    completed: false,
    targetDate: '2023-07-15',
    linkedTaskIds: ['1', '4'],
    progress: 25
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    category: 'General'
  });
  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline'>('tasks');

  const linkedTasks = tasks.filter(task => goal.linkedTaskIds.includes(task.id));
  const progress = goal.progress;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          setTasks(tasks.filter(task => task.id !== id));
        }}
      ]
    );
  };

  const openAddTaskModal = () => {
    setNewTask({
      title: '',
      description: '',
      dueDate: '',
      category: 'General'
    });
    setModalVisible(true);
  };

  const saveTask = () => {
    if (!newTask.title.trim()) {
      Alert.alert('Validation Error', 'Task title is required');
      return;
    }

    const task: Task = {
      id: `t${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      completed: false,
      category: newTask.category,
      dueDate: newTask.dueDate,
      priority: 'medium'
    };

    setTasks([...tasks, task]);
    setModalVisible(false);
  };

  const daysUntilDeadline = () => {
    if (!goal.targetDate) return 0;
    const today = new Date();
    const deadline = new Date(goal.targetDate);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-4 px-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="mr-3"
            onPress={() => router.back()}
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">{goal.title}</Text>
          <TouchableOpacity 
            className="bg-white/20 p-2 rounded-full"
            onPress={() => router.push('/goal-tracker')}
          >
            <Target color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Goal Overview Card */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800">{goal.title}</Text>
              <Text className="mt-1 text-gray-600">{goal.description}</Text>
              
              {goal.targetDate && (
                <View className="flex-row items-center mt-3">
                  <Calendar color="#6b7280" size={16} />
                  <Text className="ml-2 text-gray-500">
                    Deadline: {formatDate(goal.targetDate)}
                  </Text>
                  <Text className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    daysUntilDeadline() <= 3 ? 'bg-red-100 text-red-800' : 
                    daysUntilDeadline() <= 7 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {daysUntilDeadline()} days left
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View className="mt-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-600">Progress</Text>
              <Text className="text-sm text-gray-600">{progress}%</Text>
            </View>
            <View className="bg-gray-200 rounded-full h-3">
              <View 
                className="bg-blue-500 h-3 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
          </View>

          <View className="flex-row justify-between mt-3">
            <Text className="text-gray-600">{linkedTasks.length} linked tasks</Text>
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => router.push('/goal-tracker')}
            >
              <Edit3 color="#3B82F6" size={16} />
              <Text className="text-blue-500 ml-1">Edit Goal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white rounded-xl p-1 mb-4 shadow-sm">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === 'tasks' ? 'bg-blue-100' : ''
            }`}
            onPress={() => setActiveTab('tasks')}
          >
            <Text className={`font-medium ${
              activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Tasks ({linkedTasks.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeTab === 'timeline' ? 'bg-blue-100' : ''
            }`}
            onPress={() => setActiveTab('timeline')}
          >
            <Text className={`font-medium ${
              activeTab === 'timeline' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Timeline
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'tasks' ? (
          <View>
            {/* Tasks Section */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-800">Linked Tasks</Text>
              <TouchableOpacity 
                className="flex-row items-center bg-blue-500 py-2 px-3 rounded-full"
                onPress={openAddTaskModal}
              >
                <Plus color="white" size={16} />
                <Text className="text-white ml-1">Add Task</Text>
              </TouchableOpacity>
            </View>

            {linkedTasks.length === 0 ? (
              <View className="bg-white rounded-xl p-6 items-center justify-center">
                <Link color="#9CA3AF" size={48} />
                <Text className="text-gray-500 mt-3 text-center">
                  No tasks linked to this goal yet
                </Text>
                <Text className="text-gray-400 mt-1 text-center">
                  Add tasks to start tracking progress
                </Text>
                <TouchableOpacity 
                  className="mt-4 bg-blue-500 py-2 px-4 rounded-full"
                  onPress={openAddTaskModal}
                >
                  <Text className="text-white">Create Task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={linkedTasks}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                    <View className="flex-row justify-between">
                      <TouchableOpacity 
                        className="mr-3"
                        onPress={() => toggleTaskCompletion(item.id)}
                      >
                        {item.completed ? (
                          <CheckCircle color="#10B981" size={24} fill="#10B981" />
                        ) : (
                          <Circle color="#ccc" size={24} />
                        )}
                      </TouchableOpacity>

                      <View className="flex-1">
                        <Text className={`text-base font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {item.title}
                        </Text>
                        
                        {item.description ? (
                          <Text className={`mt-1 text-sm ${item.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.description}
                          </Text>
                        ) : null}
                        
                        <View className="flex-row items-center mt-2">
                          <Text className="text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                            {item.category}
                          </Text>
                          
                          {item.dueDate && (
                            <View className="flex-row items-center">
                              <Calendar color="#6b7280" size={12} />
                              <Text className="ml-1 text-gray-500 text-xs">
                                Due: {formatDate(item.dueDate)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View className="flex-row">
                        <TouchableOpacity 
                          className="ml-2"
                          onPress={() => deleteTask(item.id)}
                        >
                          <Trash2 color="#ef4444" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        ) : (
          <View>
            {/* Timeline Section */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-800">Progress Timeline</Text>
            </View>

            <View className="bg-white rounded-xl p-4 shadow-sm">
              {timelineEvents.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <Clock color="#9CA3AF" size={48} />
                  <Text className="text-gray-500 mt-3">No timeline events yet</Text>
                  <Text className="text-gray-400 mt-1 text-center">
                    Events will appear as you make progress
                  </Text>
                </View>
              ) : (
                <View>
                  {timelineEvents.map((event, index) => (
                    <View key={event.id} className="flex-row">
                      <View className="items-center mr-3">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${
                          index === 0 ? 'bg-blue-500' : 'bg-gray-200'
                        }`}>
                          {index === 0 ? (
                            <Check color="white" size={16} />
                          ) : (
                            <View className="w-2 h-2 bg-gray-500 rounded-full" />
                          )}
                        </View>
                        {index !== timelineEvents.length - 1 && (
                          <View className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </View>
                      
                      <View className="pb-6 flex-1">
                        <Text className="font-semibold text-gray-800">{event.title}</Text>
                        <Text className="text-gray-500 text-sm mt-1">{event.description}</Text>
                        <Text className="text-gray-400 text-xs mt-1">{formatDate(event.date)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
            
            {/* Upcoming Tasks Reminder */}
            <View className="bg-white rounded-xl p-4 mt-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Clock color="#3B82F6" size={20} />
                <Text className="font-semibold text-gray-800 ml-2">Upcoming Tasks</Text>
              </View>
              
              {linkedTasks.filter(t => !t.completed && t.dueDate).length === 0 ? (
                <Text className="text-gray-500 text-center py-2">No upcoming tasks</Text>
              ) : (
                <FlatList
                  data={linkedTasks.filter(t => !t.completed && t.dueDate)}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View className="flex-row items-center py-2">
                      <Calendar color="#6b7280" size={14} />
                      <Text className="text-gray-700 ml-2 flex-1">{item.title}</Text>
                      <Text className="text-gray-500 text-sm">
                        {formatDate(item.dueDate)}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-2/3">
            <Text className="text-xl font-bold mb-4 text-gray-800">Add New Task</Text>

            <ScrollView>
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Task Title *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="What needs to be done?"
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({...newTask, title: text})}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Description</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="Add details..."
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({...newTask, description: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Due Date</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="YYYY-MM-DD"
                  value={newTask.dueDate}
                  onChangeText={(text) => setNewTask({...newTask, dueDate: text})}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-2 font-medium">Category</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="General"
                  value={newTask.category}
                  onChangeText={(text) => setNewTask({...newTask, category: text})}
                />
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-lg py-3 items-center"
                onPress={saveTask}
              >
                <Text className="text-white font-medium">Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GoalDetailsScreen;