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

import {
  MAX_CONTENT_WIDTH,
  MAX_FORM_WIDTH,
  MAX_READING_WIDTH,
  SIDEBAR_WIDTH,
  computeResponsiveLayout,
} from '../../utils/responsiveLayout';

describe('computeResponsiveLayout', () => {
  it('handles compact mobile widths', () => {
    const layout = computeResponsiveLayout(320, 640);

    expect(layout.isCompact).toBe(true);
    expect(layout.isTablet).toBe(false);
    expect(layout.isDesktop).toBe(false);
    expect(layout.isWide).toBe(false);
    expect(layout.horizontalPadding).toBe(16);
    expect(layout.sidebarWidth).toBe(0);
    expect(layout.contentMaxWidth).toBe(MAX_READING_WIDTH);
    expect(layout.sheetMaxWidth).toBeUndefined();
    expect(layout.subjectCardWidth).toBeLessThanOrEqual(280);
  });

  it('handles tablet widths', () => {
    const layout = computeResponsiveLayout(800, 1000);

    expect(layout.isTablet).toBe(true);
    expect(layout.isDesktop).toBe(false);
    expect(layout.horizontalPadding).toBe(24);
    expect(layout.modalCentered).toBe(true);
    expect(layout.sheetMaxWidth).toBe(MAX_FORM_WIDTH);
    expect(layout.contentMaxWidth).toBe(MAX_READING_WIDTH);
  });

  it('handles desktop widths', () => {
    const layout = computeResponsiveLayout(1100, 900);

    expect(layout.isDesktop).toBe(true);
    expect(layout.isWide).toBe(false);
    expect(layout.sidebarWidth).toBe(SIDEBAR_WIDTH);
    expect(layout.contentMaxWidth).toBe(MAX_CONTENT_WIDTH);
    expect(layout.contentWidth).toBe(1100 - SIDEBAR_WIDTH);
  });

  it('handles wide desktop widths', () => {
    const layout = computeResponsiveLayout(1400, 900);

    expect(layout.isWide).toBe(true);
    expect(layout.subjectCardWidth).toBeLessThanOrEqual(300);
  });

  it('clamps modal max height for short viewports', () => {
    const layout = computeResponsiveLayout(390, 300);
    expect(layout.modalMaxHeight).toBe(320);
  });
});
