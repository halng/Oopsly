import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Palette, Globe, Bell, User, Shield, HelpCircle, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  
  // State for various settings
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('English');
  const [studyReminders, setStudyReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [username, setUsername] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  
  // Language options
  const languages = [
    { id: 'en', name: 'English' },
    { id: 'es', name: 'Spanish' },
    { id: 'fr', name: 'French' },
    { id: 'de', name: 'German' },
    { id: 'it', name: 'Italian' },
    { id: 'pt', name: 'Portuguese' },
  ];
  
  // Theme options
  const themes = [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
    { id: 'system', name: 'System Default' },
  ];
  
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-800">Settings</Text>
        <Text className="text-gray-500 mt-1">Customize your TestMaster Pro experience</Text>
      </View>
      
      <ScrollView className="flex-1 px-4 py-6">
        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-700 mb-3">Account</Text>
          <View className="bg-white rounded-xl shadow-sm">
            <TouchableOpacity 
              className="flex-row items-center justify-between p-4 border-b border-gray-100"
              onPress={() => router.push('/profile')}
            >
              <View className="flex-row items-center">
                <User size={20} color="#8BC34A" className="mr-3" />
                <View>
                  <Text className="font-medium text-gray-800">{username}</Text>
                  <Text className="text-gray-500 text-sm">{email}</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </TouchableOpacity>
            
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Shield size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Privacy Settings</Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </View>
          </View>
        </View>
        
        {/* Preferences Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-700 mb-3">Preferences</Text>
          <View className="bg-white rounded-xl shadow-sm">
            {/* Theme Selection */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Palette size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Theme</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 mr-2">{selectedTheme.name}</Text>
                <ChevronRight size={20} color="#C7C7CC" />
              </View>
            </View>
            
            {/* Language Selection */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Globe size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Language</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 mr-2">{language}</Text>
                <ChevronRight size={20} color="#C7C7CC" />
              </View>
            </View>
            
            {/* Study Reminders */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Bell size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Study Reminders</Text>
              </View>
              <Switch
                trackColor={{ false: "#E5E5EA", true: "#8BC34A" }}
                thumbColor={studyReminders ? "#FFFFFF" : "#FFFFFF"}
                ios_backgroundColor="#E5E5EA"
                onValueChange={setStudyReminders}
                value={studyReminders}
              />
            </View>
            
            {/* Sound Effects */}
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Bell size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Sound Effects</Text>
              </View>
              <Switch
                trackColor={{ false: "#E5E5EA", true: "#8BC34A" }}
                thumbColor={soundEffects ? "#FFFFFF" : "#FFFFFF"}
                ios_backgroundColor="#E5E5EA"
                onValueChange={setSoundEffects}
                value={soundEffects}
              />
            </View>
          </View>
        </View>
        
        {/* Notifications Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-700 mb-3">Notifications</Text>
          <View className="bg-white rounded-xl shadow-sm">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="font-medium text-gray-800">Push Notifications</Text>
              <Switch
                trackColor={{ false: "#E5E5EA", true: "#8BC34A" }}
                thumbColor={notifications ? "#FFFFFF" : "#FFFFFF"}
                ios_backgroundColor="#E5E5EA"
                onValueChange={setNotifications}
                value={notifications}
              />
            </View>
            
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <Text className="font-medium text-gray-800">Notification Settings</Text>
              <ChevronRight size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Support Section */}
        <View>
          <Text className="text-lg font-semibold text-gray-700 mb-3">Support</Text>
          <View className="bg-white rounded-xl shadow-sm">
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <HelpCircle size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">Help Center</Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Info size={20} color="#8BC34A" className="mr-3" />
                <Text className="font-medium text-gray-800">About</Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}