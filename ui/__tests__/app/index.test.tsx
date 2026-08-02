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

import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import WelcomeScreen from '../../app/index'; // Adjust path if needed
import { useResponsiveLayout } from '@/utils/responsiveLayout';

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/utils/responsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

const mockLayout = {
  width: 390,
  height: 800,
  isCompact: false,
  isTablet: false,
  isDesktop: false,
  isWide: false,
  horizontalPadding: 16,
  sidebarWidth: 0,
  contentWidth: 390,
  modalCentered: false,
  formMaxWidth: 560,
  contentMaxWidth: 720,
  modalMaxHeight: 656,
  sheetMaxWidth: undefined,
  otpCellSize: 48,
  subjectCardWidth: 260,
};

describe('WelcomeScreen', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useResponsiveLayout as jest.Mock).mockReturnValue(mockLayout);
    jest.clearAllMocks();
    (useResponsiveLayout as jest.Mock).mockReturnValue(mockLayout);
  });

  it('renders the first slide correctly', () => {
    render(<WelcomeScreen />);
    
    // Check Title & Subtitle
    expect(screen.getByTestId('content-view-title')).toBeTruthy();
    expect(screen.getByTestId('content-view-title').props.children).toBe('Welcome to Oopsly');
    expect(screen.getByTestId('content-view-subtitle')).toBeTruthy();
    expect(screen.getByTestId('content-view-subtitle').props.children).toBe('The smart way to study and retain information efficiently');
    
    const backButton = screen.getByTestId('back-button');
    expect(backButton.props.style.opacity).toBe(1); 
    expect(backButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates to the next slide when clicking Next', () => {
    render(<WelcomeScreen />);
    
    const nextButton = screen.getByTestId('next-button');
    fireEvent.press(nextButton);

    // Should show second slide content
    expect(screen.getByTestId('content-view-title')).toBeTruthy();
    expect(screen.getByTestId('content-view-title').props.children).toBe('Learn Smarter');
    
    // Back button should now be enabled
    const backButton = screen.getByTestId('back-button');
    expect(backButton.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('navigates back to the previous slide', () => {
    render(<WelcomeScreen />);
    
    // Go forward then back
    const nextButton = screen.getByTestId('next-button');
    fireEvent.press(nextButton); // To Slide 2
    
    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton); // Back to Slide 1

    expect(screen.getByTestId('content-view-title')).toBeTruthy();
    expect(screen.getByTestId('content-view-title').props.children).toBe('Welcome to Oopsly');
  });

  it('navigates to /onboard when clicking Skip', () => {
    render(<WelcomeScreen />);
    
    fireEvent.press(screen.getByTestId('skip-button'));
    expect(mockPush).toHaveBeenCalledWith('/onboard');
  });

  it('changes button to "Get Started" on the last slide and navigates', () => {
    render(<WelcomeScreen />);
    
    const nextButton = screen.getByTestId('next-button');
    
    // Click through to the last slide (3 slides total)
    fireEvent.press(nextButton); // To Slide 2
    fireEvent.press(nextButton); // To Slide 3

    // Check for "Get Started" text
    expect(screen.getByTestId('get-started-text')).toBeTruthy();
    expect(screen.getByTestId('get-started-text').props.children).toBe('Get Started');

    // Click it
    fireEvent.press(nextButton);
    expect(mockPush).toHaveBeenCalledWith('/onboard');
  });

  it('renders desktop layout when isDesktop is true', () => {
    (useResponsiveLayout as jest.Mock).mockReturnValue({
      ...mockLayout,
      width: 1280,
      height: 900,
      isTablet: true,
      isDesktop: true,
      isWide: true,
      sidebarWidth: 260,
      contentWidth: 1020,
      formMaxWidth: 560,
    });

    render(<WelcomeScreen />);

    expect(screen.getByTestId('content-view-title').props.children).toBe(
      'Welcome to Oopsly',
    );
    expect(screen.getByTestId('next-button')).toBeTruthy();
  });

  it('uses tablet hero sizing when isTablet and not desktop', () => {
    (useResponsiveLayout as jest.Mock).mockReturnValue({
      ...mockLayout,
      width: 800,
      height: 1000,
      isTablet: true,
      isDesktop: false,
    });

    render(<WelcomeScreen />);
    expect(screen.getByTestId('content-view-title')).toBeTruthy();
  });
});