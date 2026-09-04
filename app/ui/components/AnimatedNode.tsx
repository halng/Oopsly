import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

// Setup Animated components for NativeWind
cssInterop(Animated.View, {
  className: 'style',
});

interface AnimatedNodeProps {
  id: number;
  title: string;
  status?: 'active' | 'fading' | 'mastered';
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  className?: string;
}

const AnimatedNode: React.FC<AnimatedNodeProps> = ({
  id,
  title,
  status = 'active',
  size = 'medium',
  onPress,
  className = ''
}) => {
  // Shared values for animations
  const pulse = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Size mapping
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  const innerSizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  // Status color mapping
  const getStatusColors = () => {
    switch (status) {
      case 'fading':
        return {
          borderColor: 'border-red-500',
          backgroundColor: 'bg-red-500',
          glowColor: '#FF3333',
          textColor: 'text-red-300'
        };
      case 'mastered':
        return {
          borderColor: 'border-yellow-400',
          backgroundColor: 'bg-yellow-400',
          glowColor: '#FFD700',
          textColor: 'text-yellow-200'
        };
      case 'active':
      default:
        return {
          borderColor: 'border-cyan-400',
          backgroundColor: 'bg-cyan-400',
          glowColor: '#00F0FF',
          textColor: 'text-cyan-200'
        };
    }
  };

  const colors = getStatusColors();

  // Animation effects
  useEffect(() => {
    // Pulse animation
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Gentle rotation animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Handle press interactions
  const handlePressIn = () => {
    scale.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => {
    const pulseScale = interpolate(pulse.value, [0, 1], [1, 1.05], Extrapolate.CLAMP);
    
    return {
      transform: [
        { scale: scale.value * pulseScale },
        { rotate: `${rotation.value}deg` }
      ],
      shadowColor: colors.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(pulse.value, [0, 1], [0.5, 0.8]),
      shadowRadius: interpolate(pulse.value, [0, 1], [8, 12]),
      elevation: interpolate(pulse.value, [0, 1], [5, 8]),
    };
  });

  const animatedInnerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `-${rotation.value}deg` }
      ]
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`${className}`}
    >
      <Animated.View
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          items-center 
          justify-center 
          ${colors.borderColor} 
          border-2 
          ${colors.backgroundColor} 
          bg-opacity-20
        `}
        style={animatedContainerStyle}
      >
        <Animated.View
          className={`
            ${innerSizeClasses[size]} 
            rounded-full 
            items-center 
            justify-center 
            ${colors.backgroundColor} 
            bg-opacity-30
          `}
          style={animatedInnerStyle}
        >
          <Text 
            className={`
              font-bold 
              ${colors.textColor} 
              text-center
              ${size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'}
            `}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedNode;