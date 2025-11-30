import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, RotateCcw, Clock, Coffee } from 'lucide-react-native';

const PomodoroScreen = () => {
  const router = useRouter();
  
  // Pomodoro states
  const [minutes, setMinutes] = useState<number>(25);
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  
  // Timer configuration
  const [focusDuration, setFocusDuration] = useState<number>(25); // minutes
  const [breakDuration, setBreakDuration] = useState<number>(5); // minutes
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer to initial state
  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsActive(false);
    setMinutes(mode === 'focus' ? focusDuration : breakDuration);
    setSeconds(0);
  };

  // Toggle between focus and break modes
  const toggleMode = () => {
    if (mode === 'focus') {
      setMode('break');
      setMinutes(breakDuration);
      setSeconds(0);
    } else {
      setMode('focus');
      setMinutes(focusDuration);
      setSeconds(0);
    }
  };

  // Handle timer tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds === 0) {
            if (minutes === 0) {
              // Timer completed
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              
              // Update session count if focus mode completed
              if (mode === 'focus') {
                setSessionsCompleted(prev => prev + 1);
              }
              
              // Automatically switch mode
              setTimeout(() => {
                toggleMode();
                setIsActive(true);
              }, 1000);
              
              return 0;
            } else {
              setMinutes(prevMinutes => prevMinutes - 1);
              return 59;
            }
          } else {
            return prevSeconds - 1;
          }
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, minutes, mode]);

  // Format time to MM:SS
  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start/Pause timer
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  // Update focus duration
  const updateFocusDuration = (newDuration: number) => {
    setFocusDuration(newDuration);
    if (mode === 'focus' && !isActive) {
      setMinutes(newDuration);
      setSeconds(0);
    }
  };

  // Update break duration
  const updateBreakDuration = (newDuration: number) => {
    setBreakDuration(newDuration);
    if (mode === 'break' && !isActive) {
      setMinutes(newDuration);
      setSeconds(0);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6 mt-2">
          <Text className="text-3xl font-bold text-gray-800 text-center">Pomodoro Timer</Text>
          <Text className="text-gray-600 text-center mt-2">
            Stay focused and boost your productivity
          </Text>
        </View>

        {/* Main Timer Display */}
        <View className="items-center mb-8">
          <View 
            className={`rounded-full w-64 h-64 items-center justify-center shadow-lg ${
              mode === 'focus' 
                ? 'bg-[#8BC34A]'  // Primary green for focus
                : 'bg-[#03A9F4]'   // Accent blue for break
            }`}
          >
            <Text className="text-5xl font-bold text-white">
              {formatTime(minutes, seconds)}
            </Text>
            <Text className="text-xl text-white mt-2 capitalize">
              {mode === 'focus' ? 'Focus Time' : 'Break Time'}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row justify-center items-center mb-8">
          <TouchableOpacity
            onPress={toggleTimer}
            className={`rounded-full w-16 h-16 items-center justify-center shadow-md mr-6 ${
              isActive ? 'bg-orange-500' : 'bg-[#8BC34A]'
            }`}
          >
            {isActive ? (
              <Pause size={32} color="white" />
            ) : (
              <Play size={32} color="white" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={resetTimer}
            className="rounded-full w-16 h-16 items-center justify-center bg-gray-300 shadow-md"
          >
            <RotateCcw size={32} color="#212121" />
          </TouchableOpacity>
        </View>

        {/* Session Counter */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center justify-center mb-2">
            <Coffee size={20} color="#FF9800" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Sessions Completed
            </Text>
          </View>
          <Text className="text-3xl font-bold text-center text-[#8BC34A]">
            {sessionsCompleted}
          </Text>
        </View>

        {/* Configuration Section */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            Timer Settings
          </Text>
          
          {/* Focus Duration */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Clock size={20} color="#8BC34A" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">
                Focus Duration
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              {[15, 20, 25, 30, 45].map((duration) => (
                <TouchableOpacity
                  key={duration}
                  onPress={() => updateFocusDuration(duration)}
                  className={`py-2 px-3 rounded-lg ${
                    focusDuration === duration
                      ? 'bg-[#8BC34A] border-[#8BC34A]'
                      : 'bg-gray-100 border-gray-300'
                  } border`}
                >
                  <Text
                    className={`font-medium ${
                      focusDuration === duration ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {duration}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Break Duration */}
          <View>
            <View className="flex-row items-center mb-3">
              <Coffee size={20} color="#03A9F4" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">
                Break Duration
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              {[3, 5, 10, 15, 20].map((duration) => (
                <TouchableOpacity
                  key={duration}
                  onPress={() => updateBreakDuration(duration)}
                  className={`py-2 px-3 rounded-lg ${
                    breakDuration === duration
                      ? 'bg-[#03A9F4] border-[#03A9F4]'
                      : 'bg-gray-100 border-gray-300'
                  } border`}
                >
                  <Text
                    className={`font-medium ${
                      breakDuration === duration ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {duration}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-2">
            Productivity Tips
          </Text>
          <Text className="text-gray-600 mb-2">
            • Work in focused 25-minute intervals with 5-minute breaks
          </Text>
          <Text className="text-gray-600 mb-2">
            • After 4 sessions, take a longer 15-30 minute break
          </Text>
          <Text className="text-gray-600">
            • Eliminate distractions during focus periods
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PomodoroScreen;