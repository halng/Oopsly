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
export const WIDE_BREAKPOINT = 1280;
export const SIDEBAR_WIDTH = 260;

export function computeResponsiveLayout(width: number, height: number) {
  const isCompact = width < 360;
  const isTablet = width >= TABLET_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isWide = width >= WIDE_BREAKPOINT;
  const horizontalPadding = isTablet ? 24 : 16;
  const sidebarWidth = isDesktop ? SIDEBAR_WIDTH : 0;
  const contentWidth = width - sidebarWidth;
  // Modals are centered dialogs on tablet/desktop, bottom sheets on mobile
  const modalCentered = isTablet;

  return {
    width,
    height,
    isCompact,
    isTablet,
    isDesktop,
    isWide,
    horizontalPadding,
    sidebarWidth,
    contentWidth,
    modalCentered,
    formMaxWidth: MAX_FORM_WIDTH,
    contentMaxWidth: isDesktop ? MAX_CONTENT_WIDTH : MAX_READING_WIDTH,
    modalMaxHeight: Math.max(320, Math.floor(height * 0.82)),
    sheetMaxWidth: isTablet ? MAX_FORM_WIDTH : undefined,
    otpCellSize: Math.min(
      48,
      Math.max(40, Math.floor((width - horizontalPadding * 2 - 40) / 6)),
    ),
    subjectCardWidth: isWide
      ? Math.min(300, Math.max(220, (contentWidth - horizontalPadding * 2 - 32) / 3))
      : isTablet
        ? Math.min(320, Math.max(240, (contentWidth - horizontalPadding * 2 - 24) / 2))
        : Math.min(280, Math.max(220, width * 0.68)),
  };
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return computeResponsiveLayout(width, height);
}
