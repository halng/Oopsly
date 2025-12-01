import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const WelcomeScreen = () => {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      id: 1,
      title: "Welcome to Osmosis",
      description: "The smart way to study and retain information effectively using spaced repetition technology.",
      image: "https://images.unsplash.com/photo-1527822618093-743f3e57977c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Q2xhc3Nyb29tJTIwbGVhcm5pbmclMjBlbnZpcm9ubWVudHxlbnwwfHwwfHx8MA%3D%3D"
    },
    {
      id: 2,
      title: "Organize Your Learning",
      description: "Create shelves and subjects to organize your study materials in a structured way.",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGNsYXNzcm9vbXxlbnwwfHwwfHx8MA%3D%3D"
    },
    {
      id: 3,
      title: "Smart Spaced Repetition",
      description: "Our AI-powered system optimizes your review schedule based on your performance.",
      image: "https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8U3R1ZGVudCUyMGxlYXJuZXIlMjBwdXBpbCUyMGVkdWNhdGlvbnxlbnwwfHwwfHx8MA%3D%3D"
    },
    {
      id: 4,
      title: "Track Your Progress",
      description: "Monitor your learning journey with detailed analytics and maintain your study streak.",
      image: "https://images.unsplash.com/photo-1590098563686-06ab8778a6a7?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGl0Y2glMjBkZWNrfGVufDB8fDB8fHww"
    }
  ];

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      // @ts-ignore
      slideRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Navigate to main app after last slide
      router.replace('/auth');
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      // @ts-ignore
      slideRef.current?.scrollTo({
        x: width * (currentIndex - 1),
        animated: true,
      });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    router.replace('/auth');
  };

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View className="flex-1 bg-white">
      {/* Skip Button */}
      <TouchableOpacity 
        onPress={handleSkip}
        className="absolute top-12 right-6 z-10"
      >
        <Text className="text-indigo-600 font-medium text-base">Skip</Text>
      </TouchableOpacity>

      {/* Slide Content */}
      <Animated.ScrollView
        ref={slideRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        className="flex-1 pt-16"
      >
        {slides.map((slide) => (
          <View key={slide.id} className="w-full px-6 justify-center items-center">
            <View className="w-64 h-64 rounded-2xl overflow-hidden mb-10">
              <Image 
                source={{ uri: slide.image }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            
            <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
              {slide.title}
            </Text>
            
            <Text className="text-gray-600 text-base text-center px-4 leading-6">
              {slide.description}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center mb-2">
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`dot-${index}`}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          );
        })}
      </View>

      {/* Navigation Buttons */}
      <View className="flex-row justify-between items-center px-6 pb-12">
        <TouchableOpacity
          onPress={goToPrevious}
          disabled={currentIndex === 0}
          className={`${currentIndex === 0 ? 'opacity-30' : ''}`}
        >
          <ChevronLeft size={32} color="#6366F1" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToNext}
          className="bg-indigo-600 rounded-full w-14 h-14 items-center justify-center"
        >
          {currentIndex === slides.length - 1 ? (
            <Check size={24} color="white" />
          ) : (
            <ChevronRight size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    marginHorizontal: 4,
  },
});

export default WelcomeScreen;