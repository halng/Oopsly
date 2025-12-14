import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Plus, Edit3, CheckCircle, Circle, Trash2, Search, Filter, Calendar, X } from 'lucide-react-native';
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

const categories = ['All', 'Math', 'Science', 'History', 'Language', 'Other'];
const priorities = ['low', 'medium', 'high'];

export default function TasksListScreen() {
  const router = useRouter();
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: categories[1],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
        { text: 'Delete', style: 'destructive', onPress: () => setTasks(tasks.filter(task => task.id !== id)) }
      ]
    );
  };

  const openAddModal = () => {
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      category: categories[1],
      dueDate: '',
      priority: 'medium'
    });
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      category: task.category,
      dueDate: task.dueDate || '',
      priority: task.priority
    });
    setModalVisible(true);
  };

  const saveTask = () => {
    if (!newTask.title.trim()) {
      Alert.alert('Validation Error', 'Task title is required');
      return;
    }

    if (editingTask) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { 
              ...task, 
              title: newTask.title,
              description: newTask.description,
              category: newTask.category,
              dueDate: newTask.dueDate,
              priority: newTask.priority
            } 
          : task
      ));
    } else {
      // Add new task
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description,
        completed: false,
        category: newTask.category,
        dueDate: newTask.dueDate,
        priority: newTask.priority
      };
      setTasks([...tasks, task]);
    }

    setModalVisible(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-500 text-red-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-green-100 border-green-500 text-green-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const activeFilters = searchQuery.length > 0 || selectedCategory !== 'All';

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-800">Tasks</Text>
          <TouchableOpacity 
            className="bg-blue-500 rounded-full p-2"
            onPress={openAddModal}
          >
            <Plus color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-3">
          <Search color="#6b7280" size={20} />
          <TextInput
            className="flex-1 ml-3 text-gray-700"
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {activeFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <X color="#6b7280" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Controls */}
        <View className="flex-row justify-between items-center mb-2">
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter color="#6b7280" size={20} />
            <Text className="ml-2 text-gray-600 font-medium">Filters</Text>
          </TouchableOpacity>
          
          <Text className="text-gray-500 text-sm">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>

        {/* Category Filters */}
        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
            <View className="flex-row gap-2">
              {categories.map(category => (
                <TouchableOpacity 
                  key={category}
                  className={`px-4 py-2 rounded-full ${selectedCategory === category ? 'bg-blue-500' : 'bg-gray-200'}`}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text className={`text-sm ${selectedCategory === category ? 'text-white' : 'text-gray-700'}`}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4 pt-4"
        renderItem={({ item }) => (
          <View className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${item.completed ? 'opacity-80' : ''}`}>
            <View className="flex-row justify-between items-start">
              <TouchableOpacity 
                className="mr-3 mt-1"
                onPress={() => toggleTaskCompletion(item.id)}
              >
                {item.completed ? (
                  <CheckCircle color="#8BC34A" size={24} fill="#8BC34A" />
                ) : (
                  <Circle color="#ccc" size={24} />
                )}
              </TouchableOpacity>

              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text className={`text-lg font-semibold flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
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

                <View className="flex-row mt-3 items-center flex-wrap">
                  <View className={`px-2 py-1 rounded-full border ${getPriorityColor(item.priority)}`}>
                    <Text className="text-xs capitalize font-medium">{item.priority}</Text>
                  </View>

                  <Text className="ml-2 text-gray-500 text-sm">
                    {item.category}
                  </Text>

                  {item.dueDate && (
                    <View className="flex-row items-center ml-2 mt-1">
                      <Calendar color="#ef4444" size={14} />
                      <Text className="ml-1 text-red-500 text-sm">
                        {formatDate(item.dueDate)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                className="ml-2 mt-1"
                onPress={() => deleteTask(item.id)}
              >
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
            
            {/* Priority indicator bar */}
            <View className={`h-1 rounded-b-xl mt-3 ${getPriorityBgColor(item.priority)}`} />
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            <Text className="text-gray-500 text-lg">No tasks found</Text>
            <Text className="text-gray-400 mt-2 text-center px-4">
              {activeFilters 
                ? "Try changing your filters or search terms" 
                : "Add a new task to get started"}
            </Text>
            {!activeFilters && (
              <TouchableOpacity 
                className="mt-6 bg-blue-500 rounded-full px-6 py-3"
                onPress={openAddModal}
              >
                <Text className="text-white font-medium">Create Your First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-3/4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Title *</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 bg-gray-50"
                  placeholder="Task title"
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({...newTask, title: text})}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Description</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 bg-gray-50"
                  placeholder="Task description"
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({...newTask, description: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.slice(1).map(category => (
                    <TouchableOpacity
                      key={category}
                      className={`px-4 py-2 rounded-full ${newTask.category === category ? 'bg-blue-500' : 'bg-gray-200'}`}
                      onPress={() => setNewTask({...newTask, category})}
                    >
                      <Text className={newTask.category === category ? 'text-white' : 'text-gray-700'}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Priority</Text>
                <View className="flex-row gap-3">
                  {priorities.map(priority => (
                    <TouchableOpacity
                      key={priority}
                      className={`flex-1 py-3 rounded-xl items-center ${newTask.priority === priority ? 'bg-blue-500' : 'bg-gray-200'}`}
                      onPress={() => setNewTask({...newTask, priority: priority as any})}
                    >
                      <Text className={`capitalize font-medium ${newTask.priority === priority ? 'text-white' : 'text-gray-700'}`}>
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-2 font-medium">Due Date</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 bg-gray-50"
                  placeholder="YYYY-MM-DD"
                  value={newTask.dueDate}
                  onChangeText={(text) => setNewTask({...newTask, dueDate: text})}
                />
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-xl py-4 items-center"
                onPress={saveTask}
              >
                <Text className="text-white font-medium">
                  {editingTask ? 'Update' : 'Add'} Task
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}