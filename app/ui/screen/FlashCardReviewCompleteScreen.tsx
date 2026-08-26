import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trophy, Target, Clock, TrendingUp, Star, Zap, Award, Heart } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withDelay,
  Easing,
  withSequence
} from 'react-native-reanimated';
import { useSearchParams } from 'expo-router/build/hooks';
import Logger from '@/utils/Logger';
import { uiTokens } from '@/constants/uiTokens';
import { useResponsiveLayout } from '@/utils/responsiveLayout';


// Animated Icon Component
const FloatingIcon = ({ 
  Icon, 
  delay, 
  startX 
}: { 
  Icon: any; 
  delay: number; 
  startX: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-800, {
          duration: 3000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        -1, // infinite repeat
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 500 }),
        withDelay(2000, withTiming(0, { duration: 500 }))
      )
    );

    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.floatingIcon,
        { left: startX },
        animatedStyle
      ]}
    >
      <Icon size={32} color={uiTokens.state.success.solid} strokeWidth={2} />
    </Animated.View>
  );
};

export default function FlashCardReviewCompleteScreen({ _shelfId, _subjectId }: { _shelfId: string, _subjectId: string }) {
  const logger = Logger.extend('FlashCardReviewCompleteScreen');
  logger.debug('Rendering FlashCardReviewCompleteScreen component');
  const router = useRouter();
  const { width, isCompact, contentMaxWidth } = useResponsiveLayout();
  const scaleValue = useSharedValue(0);
    const stats = { cardsStudied: 15, accuracy: 90, timeSpent: 4 } 
  const queryParams = useSearchParams()


  // TODO: extract stats from query params
  if (queryParams && queryParams.has("duration")) {
    const durationMs = parseInt(queryParams.get("duration") as string, 10);
    if (!isNaN(durationMs)) {
      stats.timeSpent = Math.ceil(durationMs / 60000); // convert ms to minutes
    }
  }
  useEffect(() => {
    // Trophy scale animation
    scaleValue.value = withSequence(
      withTiming(1.2, { duration: 500, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 300 })
    );
  }, []);

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleBackToDeck = () => {
    router.push(`/${_shelfId}/view/${_subjectId}`);
  };

  const handleReviewHardCards = () => {
    router.push(`/${_shelfId}/review/${_subjectId}`);
  };

  // Array of icons and their positions for floating animation
  const floatingIcons = [
    { Icon: Star, delay: 0, startX: width * 0.08 },
    { Icon: Zap, delay: 300, startX: width * 0.24 },
    { Icon: Award, delay: 600, startX: width * 0.48 },
    { Icon: Heart, delay: 900, startX: width * 0.68 },
    { Icon: Star, delay: 1200, startX: width * 0.86 },
    { Icon: Trophy, delay: 1500, startX: width * 0.16 },
    { Icon: Zap, delay: 1800, startX: width * 0.36 },
    { Icon: Award, delay: 2100, startX: width * 0.6 },
    { Icon: Heart, delay: 2400, startX: width * 0.78 },
    { Icon: Star, delay: 2700, startX: width * 0.44 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={uiTokens.surface.default} />
      
      {/* Floating Icons Animation Layer */}
      <View style={styles.animationLayer}>
        {floatingIcons.map((item, index) => (
          <FloatingIcon 
            key={index}
            Icon={item.Icon}
            delay={item.delay}
            startX={item.startX}
          />
        ))}
      </View>

      {/* Hero Section */}
      <View style={[styles.heroSection, { maxWidth: contentMaxWidth }]}>
        <Animated.View style={[styles.iconContainer, trophyAnimatedStyle]}>
          <Trophy
            size={100}
            color={uiTokens.state.success.solid}
            strokeWidth={2}
          />
        </Animated.View>
        
        <Text style={styles.headlineText}>Great Job!</Text>
        <Text style={styles.subText}>You've crushed your daily goal.</Text>
      </View>

      {/* Stats Container */}
      <View style={[styles.statsSection, { maxWidth: contentMaxWidth }]}>
        <View style={[styles.statsRow, isCompact && styles.statsRowWrapped]}>
          {/* Stat Card 1: Cards */}
          <View style={[styles.statCard, isCompact && styles.statCardWrapped]}>
            <View style={styles.statIconContainer}>
              <Target size={24} color={uiTokens.state.success.solid} />
            </View>
            <Text style={styles.statValue}>{stats.cardsStudied}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>

          {/* Stat Card 2: Accuracy */}
          <View style={[styles.statCard, isCompact && styles.statCardWrapped]}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color={uiTokens.state.success.solid} />
            </View>
            <Text style={styles.statValue}>{stats.accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>

          {/* Stat Card 3: Time */}
          <View style={[styles.statCard, isCompact && styles.statCardWrapped]}>
            <View style={styles.statIconContainer}>
              <Clock size={24} color={uiTokens.state.success.solid} />
            </View>
            <Text style={styles.statValue}>{stats.timeSpent}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={[styles.footerSection, { maxWidth: contentMaxWidth }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed
          ]}
          onPress={handleBackToDeck}
          testID="complete-back-to-subject-button"
        >
          <Text style={styles.primaryButtonText}>Back to Subject</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed
          ]}
          onPress={handleReviewHardCards}
          testID="complete-review-again-button"
        >
          <Text style={styles.secondaryButtonText}>Review Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  
  // Animation Layer
  animationLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  floatingIcon: {
    position: 'absolute',
    bottom: -50,
  },

  // Hero Section Styles
  heroSection: {
    width: '100%',
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 24,
  },
  headlineText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Stats Section Styles
  statsSection: {
    width: '100%',
    flex: 0.3,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsRowWrapped: {
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardWrapped: {
    flexBasis: '48%',
    padding: 16,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Footer Section Styles
  footerSection: {
    width: '100%',
    flex: 0.3,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonPressed: {
    backgroundColor: '#059669',
    elevation: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#10B981',
  },
});