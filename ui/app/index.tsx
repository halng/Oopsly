/*
 *    Copyright 2025 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */


import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Logger } from '@/utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Onboarding data
const ONBOARDING_DATA = [
  {
    id: 1,
    title: 'Welcome to Oopsly',
    subtitle: 'The smart way to study and retain information efficiently',
    image: 'https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0'
  },
  {
    id: 2,
    title: 'Learn Smarter',
    subtitle: 'Use AI-powered flashcards and spaced repetition to maximize retention',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0'
  },
  {
    id: 3,
    title: 'Track Progress',
    subtitle: 'Monitor your learning journey with detailed analytics and insights',
    image: 'https://images.unsplash.com/photo-1527822618093-743f3e57977c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0'
  }
];

export default function WelcomeScreen() {
  const logger = Logger.extend('WelcomeScreen');
  logger.debug('Rendering WelcomeScreen component');
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  
  const handleNext = () => {
    if (currentIndex === ONBOARDING_DATA.length - 1) {
      router.push('/onboard');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    logger.info('User skipped onboarding');
    router.push('/onboard');
  };

  const currentSlide = ONBOARDING_DATA[currentIndex];
  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;

  return (
    <SafeAreaView testID='safe-area-view' className="flex-1 bg-white">
      <View testID='main-view' className="flex-1 px-6">
        <View testID='header-view' className="w-full items-end py-4">
          <TouchableOpacity
            onPress={handleSkip}
            className="py-2 px-4"
          >
            <Text className="text-gray-500 text-base">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Image Section */}
        <View 
        testID='image-view'
          className="w-full items-center justify-center"
          style={{ height: SCREEN_HEIGHT * 0.4 }}
        >
          <Image
            testID='image-view-image'
            source={{ uri: currentSlide.image }}
            className="w-full h-full"
            resizeMode="contain"
            style={{ 
              width: SCREEN_WIDTH * 0.8,
              maxHeight: SCREEN_HEIGHT * 0.4 
            }}
          />
        </View>

        {/* Content Section */}
        <View testID='content-view' className="flex-1 items-center justify-center mt-8 gap-4">
          <Text testID='content-view-title' className="text-2xl font-bold text-gray-900 text-center px-4">
            {currentSlide.title}
          </Text>
          <Text testID='content-view-subtitle' className="text-base text-gray-600 text-center px-4 max-w-[300px]">
            {currentSlide.subtitle}
          </Text>
        </View>

        {/* Pagination Dots */}
        <View testID='pagination-dots-view' className="flex-row justify-center items-center gap-2 my-8">
          {ONBOARDING_DATA.map((_, index) => (
            <View
              testID={`pagination-dot-${index}`}
              key={index}
              className={`h-2 rounded-full ${
                index === currentIndex 
                  ? 'w-6 bg-[#5B5BFD]' 
                  : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Bottom Navigation */}
        <View testID='bottom-navigation-view' className="flex-row items-center justify-between pb-8">
          {/* Back Button */}
          <TouchableOpacity
            testID='back-button'
            onPress={handleBack}
            className={`p-4 ${currentIndex === 0 ? 'opacity-0' : 'bg-[#5B5BFD] rounded-full'}`}
            disabled={currentIndex === 0}
            style={{
              shadowColor: '#5B5BFD',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <ChevronLeft 
              size={24} 
              color={currentIndex === 0 ? 'transparent' : 'white'}
            />
          </TouchableOpacity>

          {/* Next/Get Started Button */}
          <TouchableOpacity
            testID='next-button'
            onPress={handleNext}
            className="bg-[#5B5BFD] rounded-full p-4"
            style={{
              shadowColor: '#5B5BFD',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            {isLastSlide ? (
              <Text className="text-white font-semibold px-4" testID='get-started-text'>
                Get Started
              </Text>
            ) : (
              <ChevronRight size={24} color="white" testID='next-icon' />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}