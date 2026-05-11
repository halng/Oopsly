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

import { useWindowDimensions } from "react-native";

export const MAX_FORM_WIDTH = 560;
export const MAX_CONTENT_WIDTH = 960;
export const MAX_READING_WIDTH = 720;
export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const isTablet = width >= TABLET_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const horizontalPadding = isTablet ? 24 : 16;

  return {
    width,
    height,
    isCompact,
    isTablet,
    isDesktop,
    horizontalPadding,
    formMaxWidth: MAX_FORM_WIDTH,
    contentMaxWidth: isDesktop ? MAX_CONTENT_WIDTH : MAX_READING_WIDTH,
    modalMaxHeight: Math.max(320, Math.floor(height * 0.82)),
    sheetMaxWidth: isTablet ? MAX_FORM_WIDTH : undefined,
    otpCellSize: Math.min(
      48,
      Math.max(40, Math.floor((width - horizontalPadding * 2 - 40) / 6)),
    ),
    subjectCardWidth: isTablet
      ? Math.min(320, Math.max(240, (width - horizontalPadding * 2 - 24) / 2))
      : Math.min(280, Math.max(220, width * 0.68)),
  };
}
