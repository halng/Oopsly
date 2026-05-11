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

// Light-mode semantic tokens. Pairs are chosen so that text-on-surface
// combinations meet WCAG AA contrast for body text (>= 4.5:1) and at least
// AA Large (>= 3:1) for icons and large headings.

export const uiTokens = {
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#64748B",
    onAccent: "#FFFFFF",
    onSubtle: "#1E293B",
  },
  surface: {
    canvas: "#F8FAFC",
    default: "#FFFFFF",
    subtle: "#F1F5F9",
    overlay: "rgba(15, 23, 42, 0.45)",
  },
  border: {
    subtle: "#E2E8F0",
    strong: "#CBD5E1",
    focus: "#4338CA",
  },
  accent: {
    default: "#4338CA",
    pressed: "#3730A3",
    disabled: "#C7D2FE",
    tint: "#EEF2FF",
    onTint: "#3730A3",
  },
  state: {
    error: {
      bg: "#FEF2F2",
      border: "#FECACA",
      text: "#B91C1C",
      solid: "#DC2626",
      solidPressed: "#B91C1C",
    },
    success: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      text: "#047857",
      solid: "#059669",
    },
    warning: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      text: "#B45309",
      solid: "#D97706",
    },
    info: {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      text: "#1D4ED8",
      solid: "#2563EB",
    },
  },
  // Review flow keeps a stronger color identity (gradient hero) but routes
  // its raw values through tokens so consumers stay consistent.
  review: {
    gradientStart: "#4F46E5",
    gradientMid: "#7C3AED",
    gradientEnd: "#DB2777",
    cardBg: "#FFFFFF",
    questionBadge: "#EEF2FF",
    questionBadgeText: "#4338CA",
    answerBadge: "#DBEAFE",
    answerBadgeText: "#1D4ED8",
    rating: {
      againStart: "#EF4444",
      againEnd: "#DC2626",
      hardStart: "#F97316",
      hardEnd: "#EA580C",
      goodStart: "#3B82F6",
      goodEnd: "#2563EB",
      easyStart: "#10B981",
      easyEnd: "#059669",
    },
  },
} as const;

export type UiTokens = typeof uiTokens;
