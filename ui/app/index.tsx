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
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Logger } from '@/utils';
import { uiTokens } from '@/constants/uiTokens';
import FadeIn from '@/components/common/FadeIn';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

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
  const { width, height, isDesktop, isTablet, formMaxWidth } = useResponsiveLayout();
  const heroHeight = Math.min(height * (isTablet ? 0.36 : 0.4), 360);
  const heroWidth = Math.min(width * 0.82, isTablet ? 520 : 360);

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

  const accentShadow = {
    shadowColor: uiTokens.accent.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  };

  const PaginationDots = () => (
    <View testID='pagination-dots-view' style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 24 }}>
      {ONBOARDING_DATA.map((_, index) => (
        <View
          testID={`pagination-dot-${index}`}
          key={index}
          style={{
            height: 8,
            width: index === currentIndex ? 24 : 8,
            borderRadius: 4,
            backgroundColor:
              index === currentIndex
                ? uiTokens.accent.default
                : uiTokens.border.subtle,
          }}
        />
      ))}
    </View>
  );

  const NavigationButtons = () => (
    <View testID='bottom-navigation-view' style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <TouchableOpacity
        testID='back-button'
        onPress={handleBack}
        style={{
          ...accentShadow,
          padding: 16,
          borderRadius: 999,
          opacity: currentIndex === 0 ? 0 : 1,
          backgroundColor: currentIndex === 0 ? 'transparent' : uiTokens.accent.default,
        }}
        disabled={currentIndex === 0}
        accessibilityRole="button"
        accessibilityLabel="Previous slide"
        accessibilityState={{ disabled: currentIndex === 0 }}
      >
        <ChevronLeft
          size={24}
          color={currentIndex === 0 ? 'transparent' : uiTokens.text.onAccent}
        />
      </TouchableOpacity>

      <TouchableOpacity
        testID='next-button'
        onPress={handleNext}
        style={{
          ...accentShadow,
          borderRadius: 999,
          padding: 16,
          backgroundColor: uiTokens.accent.default,
        }}
        accessibilityRole="button"
        accessibilityLabel={isLastSlide ? 'Get started' : 'Next slide'}
      >
        {isLastSlide ? (
          <Text
            style={{
              color: uiTokens.text.onAccent,
              fontWeight: '600',
              paddingHorizontal: 16,
            }}
            testID='get-started-text'
          >
            Get Started
          </Text>
        ) : (
          <ChevronRight
            size={24}
            color={uiTokens.text.onAccent}
            testID='next-icon'
          />
        )}
      </TouchableOpacity>
    </View>
  );

  // Desktop: side-by-side — content left, hero image right
  if (isDesktop) {
    return (
      <SafeAreaView
        testID='safe-area-view'
        style={{ flex: 1, backgroundColor: uiTokens.surface.default }}
      >
        <View testID='main-view' style={{ flex: 1, flexDirection: 'row' }}>
          {/* Left: Onboarding content */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: 56,
              paddingVertical: 40,
              maxWidth: 600,
            }}
          >
            {/* Logo */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: uiTokens.accent.default,
                marginBottom: 48,
              }}
            >
              Oopsly
            </Text>

            {/* Slide content */}
            <FadeIn key={currentSlide.id} delay={40} duration={260} translate={6}>
              <Text
                testID='content-view-title'
                style={{
                  color: uiTokens.text.primary,
                  fontSize: 36,
                  fontWeight: '700',
                  marginBottom: 16,
                  lineHeight: 44,
                }}
              >
                {currentSlide.title}
              </Text>
              <Text
                testID='content-view-subtitle'
                style={{
                  color: uiTokens.text.secondary,
                  fontSize: 18,
                  lineHeight: 28,
                  maxWidth: 420,
                }}
              >
                {currentSlide.subtitle}
              </Text>
            </FadeIn>

            <PaginationDots />
            <NavigationButtons />

            {/* Skip */}
            <TouchableOpacity
              onPress={handleSkip}
              testID='skip-button'
              accessibilityRole='button'
              accessibilityLabel='Skip onboarding'
              style={{ marginTop: 24, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: uiTokens.text.muted, fontSize: 15 }} testID='skip-button-text'>
                Skip intro
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right: Hero image */}
          <View
            style={{
              flex: 1,
              backgroundColor: uiTokens.surface.subtle,
              overflow: 'hidden',
            }}
          >
            <Image
              testID='image-view-image'
              source={{ uri: currentSlide.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode='cover'
            />
            {/* Gradient-style overlay at bottom for elegance */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 160,
                backgroundColor: 'rgba(0,0,0,0.12)',
              }}
              pointerEvents='none'
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile / tablet: vertical single-column carousel
  return (
    <SafeAreaView
      testID='safe-area-view'
      style={{ flex: 1, backgroundColor: uiTokens.surface.default }}
    >
      <View testID='main-view' className="flex-1 px-6 items-center">
        <View className="w-full flex-1" style={{ maxWidth: formMaxWidth }}>
          <View testID='header-view' className="w-full items-end py-4">
            <TouchableOpacity
              onPress={handleSkip}
              className="py-2 px-4"
              testID="skip-button"
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text
                style={{ color: uiTokens.text.muted, fontSize: 16 }}
                testID="skip-button-text"
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>

          <View
            testID='image-view'
            className="w-full items-center justify-center"
            style={{ height: heroHeight }}
          >
            <Image
              testID='image-view-image'
              source={{ uri: currentSlide.image }}
              className="w-full h-full"
              resizeMode="contain"
              style={{
                width: heroWidth,
                maxHeight: heroHeight
              }}
            />
          </View>

          <FadeIn
            key={currentSlide.id}
            delay={40}
            duration={260}
            translate={6}
            className="flex-1"
          >
            <View
              testID='content-view'
              className="flex-1 items-center justify-center mt-6 gap-4"
            >
              <Text
                testID='content-view-title'
                style={{
                  color: uiTokens.text.primary,
                  fontSize: 24,
                  fontWeight: "700",
                  textAlign: "center",
                  paddingHorizontal: 16,
                }}
              >
                {currentSlide.title}
              </Text>
              <Text
                testID='content-view-subtitle'
                style={{
                  color: uiTokens.text.secondary,
                  fontSize: 16,
                  textAlign: "center",
                  paddingHorizontal: 16,
                  maxWidth: isTablet ? 460 : 320,
                }}
              >
                {currentSlide.subtitle}
              </Text>
            </View>
          </FadeIn>

          <View testID='pagination-dots-view' className="flex-row justify-center items-center gap-2 my-8">
            {ONBOARDING_DATA.map((_, index) => (
              <View
                testID={`pagination-dot-${index}`}
                key={index}
                style={{
                  height: 8,
                  width: index === currentIndex ? 24 : 8,
                  borderRadius: 4,
                  backgroundColor:
                    index === currentIndex
                      ? uiTokens.accent.default
                      : uiTokens.border.subtle,
                }}
              />
            ))}
          </View>

          <View testID='bottom-navigation-view' className="flex-row items-center justify-between pb-8">
            <TouchableOpacity
              testID='back-button'
              onPress={handleBack}
              className={
                currentIndex === 0
                  ? "p-4 opacity-0"
                  : "p-4 rounded-full"
              }
              disabled={currentIndex === 0}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
              accessibilityState={{ disabled: currentIndex === 0 }}
              style={{
                ...accentShadow,
                backgroundColor:
                  currentIndex === 0 ? "transparent" : uiTokens.accent.default,
              }}
            >
              <ChevronLeft
                size={24}
                color={currentIndex === 0 ? "transparent" : uiTokens.text.onAccent}
              />
            </TouchableOpacity>

            <TouchableOpacity
              testID='next-button'
              onPress={handleNext}
              className="rounded-full p-4"
              accessibilityRole="button"
              accessibilityLabel={isLastSlide ? "Get started" : "Next slide"}
              style={{
                ...accentShadow,
                backgroundColor: uiTokens.accent.default,
              }}
            >
              {isLastSlide ? (
                <Text
                  style={{
                    color: uiTokens.text.onAccent,
                    fontWeight: "600",
                    paddingHorizontal: 16,
                  }}
                  testID='get-started-text'
                >
                  Get Started
                </Text>
              ) : (
                <ChevronRight
                  size={24}
                  color={uiTokens.text.onAccent}
                  testID='next-icon'
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
