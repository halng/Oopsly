/*
 *    Copyright 2026 Hao Nguyen Tan
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

import React, { ReactNode, useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

type Props = {
  children: ReactNode;
  duration?: number;
  delay?: number;
  translate?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
};

export default function FadeIn({
  children,
  duration = 220,
  delay = 0,
  translate = 8,
  style,
  className,
  testID,
}: Props) {
  const opacity = useSharedValue(0);
  const offset = useSharedValue(translate);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    offset.value = withDelay(delay, withTiming(0, { duration }));
  }, [delay, duration, opacity, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      className={className}
      style={[animatedStyle, style]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
