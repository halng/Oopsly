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

/** Design tokens mirrored from ui/constants/uiTokens.ts for Cypress CSS assertions. */
export const tokens = {
  accent: "rgb(108, 99, 255)", // #6C63FF
  accentTint: "rgb(237, 233, 255)", // #EDE9FF
  accentOnTint: "rgb(67, 56, 202)", // #4338CA
  canvas: "rgb(247, 248, 255)", // #F7F8FF
  card: "rgb(255, 255, 255)", // #FFFFFF
  textPrimary: "rgb(30, 27, 75)", // #1E1B4B
  textMuted: "rgb(107, 114, 128)", // #6B7280
  textOnAccent: "rgb(255, 255, 255)",
  border: "rgb(229, 231, 235)", // #E5E7EB
  error: "rgb(239, 68, 68)", // #EF4444
  success: "rgb(74, 222, 128)", // #4ADE80
  warning: "rgb(245, 158, 11)", // #F59E0B
  streak: "rgb(255, 107, 107)", // #FF6B6B
} as const;
