import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Switch, Alert } from 'react-native';
import { Calendar, Clock, Bell, Plus, X, Edit3, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Types
type StudySession = {
  id: string;
  title: string;
  date: string; // ISO string
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  subject: string;
  reminderEnabled: boolean;
  reminderTime: string; // minutes before
  location?: string;
  notes?: string;
};

type DayData = {
  date: string; // YYYY-MM-DD
  sessions: StudySession[];
};

const StudyPlannerScreen = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  
  // Mock data for study sessions
  const [sessions, setSessions] = useState<StudySession[]>([
    {
      id: '1',
      title: 'Mathematics - Calculus',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Mathematics',
      reminderEnabled: true,
      reminderTime: '15',
      location: 'Library Room 3',
      notes: 'Focus on derivatives'
    },
    {
      id: '2',
      title: 'Physics - Mechanics',
      date: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '15:30',
      subject: 'Physics',
      reminderEnabled: true,
      reminderTime: '30',
      location: 'Home',
      notes: 'Chapter 5 problems'
    },
    {
      id: '3',
      title: 'History - World War II',
      date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:30',
      subject: 'History',
      reminderEnabled: false,
      reminderTime: '15',
      location: 'Online',
      notes: 'Important dates and events'
    }
  ]);

  // Form state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    date: selectedDate,
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    reminderEnabled: true,
    reminderTime: '15',
    location: '',
    notes: ''
  });

  // Get sessions for selected date
  const getSessionsForDate = (date: string) => {
    return sessions.filter(session => session.date === date);
  };

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  // Open modal for new session
  const openNewSessionModal = () => {
    setSessionForm({
      title: '',
      date: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
      subject: '',
      reminderEnabled: true,
      reminderTime: '15',
      location: '',
      notes: ''
    });
    setEditingSession(null);
    setShowSessionModal(true);
  };

  // Open modal for editing session
  const openEditSessionModal = (session: StudySession) => {
    setSessionForm({
      title: session.title,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      subject: session.subject,
      reminderEnabled: session.reminderEnabled,
      reminderTime: session.reminderTime,
      location: session.location || '',
      notes: session.notes || ''
    });
    setEditingSession(session);
    setShowSessionModal(true);
  };

  // Save session
  const saveSession = () => {
    if (!sessionForm.title || !sessionForm.subject) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    if (editingSession) {
      // Update existing session
      setSessions(sessions.map(session => 
        session.id === editingSession.id ? { ...sessionForm, id: editingSession.id } : session
      ));
    } else {
      // Add new session
      const newSession: StudySession = {
        ...sessionForm,
        id: Math.random().toString(36).substring(7)
      };
      setSessions([...sessions, newSession]);
    }
    
    setShowSessionModal(false);
  };

  // Delete session
  const deleteSession = (id: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setSessions(sessions.filter(s => s.id !== id)) }
      ]
    );
  };

  // Generate calendar days (current month)
  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Previous month days
    for (let i = firstDay.getDay(); i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const totalCells = 42; // 6 weeks
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-6 px-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-2xl font-bold">Study Planner</Text>
          <TouchableOpacity 
            className="bg-white/20 p-2 rounded-full"
            onPress={() => router.push('/')}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
        </View>
        <Text className="text-white/90 mt-2">
          Schedule your study sessions and set reminders
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 p-4">
        {/* Calendar Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <Calendar color="#3B82F6" size={24} />
            <Text className="text-lg font-bold ml-2">Calendar</Text>
          </View>
          
          {/* Calendar Grid */}
          <View className="bg-white rounded-xl shadow-sm p-4">
            {/* Weekday Headers */}
            <View className="flex-row justify-between mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} className="w-10 text-center font-medium text-gray-500">
                  {day}
                </Text>
              ))}
            </View>
            
            {/* Calendar Days */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((dayData, index) => {
                const isSelected = dayData.date === selectedDate;
                const daySessions = getSessionsForDate(dayData.date);
                const hasSessions = daySessions.length > 0;
                
                return (
                  <TouchableOpacity
                    key={index}
                    className={`w-10 h-10 items-center justify-center m-0.5 rounded-full ${
                      isSelected 
                        ? 'bg-blue-500' 
                        : dayData.isCurrentMonth 
                          ? 'bg-transparent' 
                          : 'bg-gray-100'
                    }`}
                    onPress={() => handleDateSelect(dayData.date)}
                  >
                    <Text 
                      className={`${
                        isSelected 
                          ? 'text-white font-bold' 
                          : dayData.isCurrentMonth 
                            ? 'text-gray-800' 
                            : 'text-gray-400'
                      }`}
                    >
                      {new Date(dayData.date).getDate()}
                    </Text>
                    {hasSessions && !isSelected && (
                      <View className="absolute bottom-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Selected Date Sessions */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <TouchableOpacity 
              className="bg-blue-500 p-2 rounded-full"
              onPress={openNewSessionModal}
            >
              <Plus color="white" size={20} />
            </TouchableOpacity>
          </View>
          
          {/* Sessions List */}
          {getSessionsForDate(selectedDate).length > 0 ? (
            <View className="space-y-3">
              {getSessionsForDate(selectedDate).map((session) => (
                <View 
                  key={session.id} 
                  className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500"
                >
                  <View className="flex-row justify-between">
                    <Text className="font-bold text-lg">{session.title}</Text>
                    <View className="flex-row">
                      <TouchableOpacity 
                        className="mr-2"
                        onPress={() => openEditSessionModal(session)}
                      >
                        <Edit3 color="#6B7280" size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSession(session.id)}>
                        <Trash2 color="#EF4444" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center mt-2">
                    <Clock color="#6B7280" size={16} />
                    <Text className="ml-2 text-gray-600">
                      {session.startTime} - {session.endTime}
                    </Text>
                  </View>
                  
                  <Text className="mt-2 text-gray-700">{session.subject}</Text>
                  
                  {session.location && (
                    <Text className="mt-1 text-gray-500 text-sm">{session.location}</Text>
                  )}
                  
                  <View className="flex-row items-center mt-2">
                    <Bell 
                      color={session.reminderEnabled ? "#10B981" : "#9CA3AF"} 
                      size={16} 
                    />
                    <Text className={`ml-2 text-sm ${session.reminderEnabled ? "text-green-600" : "text-gray-400"}`}>
                      {session.reminderEnabled 
                        ? `${session.reminderTime} min before` 
                        : "No reminder"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-white rounded-xl shadow-sm p-8 items-center">
              <Text className="text-gray-500 text-center">
                No study sessions scheduled for this day
              </Text>
              <TouchableOpacity 
                className="mt-4 bg-blue-500 py-2 px-4 rounded-lg"
                onPress={openNewSessionModal}
              >
                <Text className="text-white font-medium">Schedule Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Reminder Settings */}
        <View>
          <View className="flex-row items-center mb-4">
            <Bell color="#3B82F6" size={24} />
            <Text className="text-lg font-bold ml-2">Reminder Settings</Text>
          </View>
          
          <View className="bg-white rounded-xl shadow-sm p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-medium">Enable Reminders</Text>
              <Switch 
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="font-medium">Default Reminder Time</Text>
              <View className="flex-row items-center">
                <TextInput 
                  className="border border-gray-300 rounded-lg px-3 py-1 w-16 text-right"
                  value="15"
                  keyboardType="numeric"
                />
                <Text className="ml-2 text-gray-600">minutes</Text>
              </View>
            </View>
            
            <TouchableOpacity className="mt-4 bg-gray-100 py-3 rounded-lg items-center">
              <Text className="text-blue-600 font-medium">Advanced Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Session Modal */}
      <Modal
        visible={showSessionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="pt-12 pb-4 px-4 bg-blue-600">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">
                {editingSession ? "Edit Session" : "New Session"}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowSessionModal(false)}
              >
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-medium mb-2">Session Title *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter session title"
                value={sessionForm.title}
                onChangeText={(text) => setSessionForm({...sessionForm, title: text})}
              />
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Subject *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter subject"
                value={sessionForm.subject}
                onChangeText={(text) => setSessionForm({...sessionForm, subject: text})}
              />
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Date</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={new Date(sessionForm.date).toLocaleDateString()}
                editable={false}
              />
            </View>
            
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="font-medium mb-2">Start Time</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="HH:MM"
                  value={sessionForm.startTime}
                  onChangeText={(text) => setSessionForm({...sessionForm, startTime: text})}
                />
              </View>
              
              <View className="flex-1 ml-2">
                <Text className="font-medium mb-2">End Time</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="HH:MM"
                  value={sessionForm.endTime}
                  onChangeText={(text) => setSessionForm({...sessionForm, endTime: text})}
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Location</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Where will you study?"
                value={sessionForm.location}
                onChangeText={(text) => setSessionForm({...sessionForm, location: text})}
              />
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Notes</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 h-24"
                placeholder="Add any notes..."
                value={sessionForm.notes}
                onChangeText={(text) => setSessionForm({...sessionForm, notes: text})}
                multiline
                textAlignVertical="top"
              />
            </View>
            
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-medium">Set Reminder</Text>
                <Switch 
                  value={sessionForm.reminderEnabled}
                  onValueChange={(value) => setSessionForm({...sessionForm, reminderEnabled: value})}
                  trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {sessionForm.reminderEnabled && (
                <View className="flex-row items-center pl-2">
                  <Text className="mr-2">Remind me</Text>
                  <TextInput 
                    className="border border-gray-300 rounded-lg px-3 py-1 w-16 text-center"
                    value={sessionForm.reminderTime}
                    keyboardType="numeric"
                    onChangeText={(text) => setSessionForm({...sessionForm, reminderTime: text})}
                  />
                  <Text className="ml-2">minutes before</Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity 
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={saveSession}
            >
              <Text className="text-white font-bold text-lg">
                {editingSession ? "Update Session" : "Save Session"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default StudyPlannerScreen;