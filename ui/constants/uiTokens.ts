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

export const uiTokens = {
  text: {
    primary: '#1E1B4B',
    secondary: '#4B5563',
    muted: '#6B7280',
    onAccent: '#FFFFFF',
    onSubtle: '#1E1B4B',
  },
  surface: {
    canvas: '#F7F8FF',
    default: '#FFFFFF',
    subtle: '#EDE9FF',
    overlay: 'rgba(30, 27, 75, 0.45)',
  },
  border: {
    subtle: '#E5E7EB',
    strong: '#D1D5DB',
    focus: '#6C63FF',
  },
  accent: {
    default: '#6C63FF',
    pressed: '#4338CA',
    disabled: '#C4C0FF',
    tint: '#EDE9FF',
    onTint: '#4338CA',
  },
  state: {
    error: {
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#B91C1C',
      solid: '#EF4444',
      solidPressed: '#DC2626',
    },
    success: {
      bg: '#DCFCE7',
      border: '#A7F3D0',
      text: '#15803D',
      solid: '#4ADE80',
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#B45309',
      solid: '#F59E0B',
    },
    info: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      solid: '#2563EB',
    },
  },
  review: {
    gradientStart: '#6C63FF',
    gradientMid: '#8B7FF7',
    gradientEnd: '#FF6B6B',
    cardBg: '#FFFFFF',
    questionBadge: '#EDE9FF',
    questionBadgeText: '#6C63FF',
    answerBadge: '#DBEAFE',
    answerBadgeText: '#1D4ED8',
    rating: {
      again: '#EF4444',
      hard: '#F59E0B',
      good: '#4ADE80',
      easy: '#6C63FF',
    },
  },
  colors: {
    primary: '#6C63FF',
    primaryLight: '#EDE9FF',
    primaryDark: '#4338CA',
    accent: '#FF6B6B',
    accentLight: '#FFE4E4',
    success: '#4ADE80',
    successLight: '#DCFCE7',
    error: '#EF4444',
    warning: '#F59E0B',
    background: '#F7F8FF',
    card: '#FFFFFF',
    textPrimary: '#1E1B4B',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    streak: '#FF6B6B',
    xp: '#6C63FF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadow: {
    card: {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    floating: {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const;

export type UiTokens = typeof uiTokens;
