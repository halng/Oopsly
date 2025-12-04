import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Plus, Edit3, CheckCircle, Circle, Trash2, Search, Filter, Calendar } from 'lucide-react-native';
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

const categories = ['Math', 'Science', 'History', 'Language', 'Other'];
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
const [modalVisible, setModalVisible] = useState(false);
const [editingTask, setEditingTask] = useState<Task | null>(null);
const [newTask, setNewTask] = useState({
title: '',
description: '',
category: categories[0],
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
category: categories[0],
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
case 'high': return 'bg-red-100 border-red-500';
case 'medium': return 'bg-yellow-100 border-yellow-500';
case 'low': return 'bg-green-100 border-green-500';
default: return 'bg-gray-100 border-gray-500';
}
};

const formatDate = (dateString?: string) => {
if (!dateString) return '';
const date = new Date(dateString);
return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

return (
<View className="flex-1 bg-gray-50">


{/* Search Bar */}
<View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
<Search color="#6b7280" size={20} />
<TextInput
className="flex-1 ml-2 text-gray-700"
placeholder="Search tasks..."
value={searchQuery}
onChangeText={setSearchQuery}
/>
</View>

{/* Category Filters */}
<ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
<View className="flex-row gap-2">
<TouchableOpacity 
className={`px-4 py-2 rounded-full ${selectedCategory === 'All' ? 'bg-blue-500' : 'bg-gray-200'}`}
onPress={() => setSelectedCategory('All')}
>
<Text className={`${selectedCategory === 'All' ? 'text-white' : 'text-gray-700'}`}>All</Text>
</TouchableOpacity>
{categories.map(category => (
<TouchableOpacity 
key={category}
className={`px-4 py-2 rounded-full ${selectedCategory === category ? 'bg-blue-500' : 'bg-gray-200'}`}
onPress={() => setSelectedCategory(category)}
>
<Text className={`${selectedCategory === category ? 'text-white' : 'text-gray-700'}`}>{category}</Text>
</TouchableOpacity>
))}
</View>
</ScrollView>

{/* Task List */}
<FlatList
data={filteredTasks}
keyExtractor={(item) => item.id}
className="flex-1 px-4"
renderItem={({ item }) => (
<View className={`bg-white rounded-xl p-4 mb-3 border-l-4 ${item.completed ? 'border-gray-300' : 'border-blue-500'} shadow-sm`}>
<View className="flex-row justify-between items-start">
<TouchableOpacity 
className="mr-3"
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

<View className="flex-row mt-2 items-center">
<View className={`px-2 py-1 rounded-full border ${getPriorityColor(item.priority)}`}>
<Text className="text-xs capitalize">{item.priority}</Text>
</View>

<Text className="ml-2 text-gray-500 text-sm">
{item.category}
</Text>

{item.dueDate && (
<Text className="ml-2 text-red-500 text-sm">
{formatDate(item.dueDate)}
</Text>
)}
</View>
</View>

<TouchableOpacity 
className="ml-2"
onPress={() => deleteTask(item.id)}
>
<Trash2 color="#ef4444" size={20} />
</TouchableOpacity>
</View>
</View>
)}
ListEmptyComponent={
<View className="flex-1 justify-center items-center py-12">
<Text className="text-gray-500 text-lg">No tasks found</Text>
<Text className="text-gray-400 mt-2">Try changing your filters</Text>
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

{/* Task Modal */}
<Modal
animationType="slide"
transparent={true}
visible={modalVisible}
onRequestClose={() => setModalVisible(false)}
>
<View className="flex-1 bg-black/50 justify-end">
<View className="bg-white rounded-t-3xl p-6 h-3/4">
<Text className="text-xl font-bold mb-4 text-gray-800">
{editingTask ? 'Edit Task' : 'Add New Task'}
</Text>

<ScrollView>
<View className="mb-4">
<Text className="text-gray-700 mb-2 font-medium">Title *</Text>
<TextInput
className="border border-gray-300 rounded-lg p-3"
placeholder="Task title"
value={newTask.title}
onChangeText={(text) => setNewTask({...newTask, title: text})}
/>
</View>

<View className="mb-4">
<Text className="text-gray-700 mb-2 font-medium">Description</Text>
<TextInput
className="border border-gray-300 rounded-lg p-3"
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
{categories.map(category => (
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
<View className="flex-row gap-2">
{priorities.map(priority => (
<TouchableOpacity
key={priority}
className={`flex-1 py-2 rounded-lg items-center ${newTask.priority === priority ? 'bg-blue-500' : 'bg-gray-200'}`}
onPress={() => setNewTask({...newTask, priority: priority as any})}
>
<Text className={`capitalize ${newTask.priority === priority ? 'text-white' : 'text-gray-700'}`}>
{priority}
</Text>
</TouchableOpacity>
))}
</View>
</View>

<View className="mb-6">
<Text className="text-gray-700 mb-2 font-medium">Due Date</Text>
<TextInput
className="border border-gray-300 rounded-lg p-3"
placeholder="YYYY-MM-DD"
value={newTask.dueDate}
onChangeText={(text) => setNewTask({...newTask, dueDate: text})}
/>
</View>
</ScrollView>

<View className="flex-row gap-3">
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