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

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import WelcomeScreen from '../app/index'; // Adjust path if needed
import { useRouter } from 'expo-router';

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

describe('WelcomeScreen', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
  });

  it('renders the first slide correctly', () => {
    render(<WelcomeScreen />);
    
    // Check Title & Subtitle
    expect(screen.getByText('Welcome to Osmisis')).toBeTruthy();
    expect(screen.getByText('The smart way to study and retain information efficiently')).toBeTruthy();
    
    const backButton = screen.getByTestId('back-button');
    expect(backButton.props.style.opacity).toBe(1); 
    expect(backButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates to the next slide when clicking Next', () => {
    render(<WelcomeScreen />);
    
    const nextButton = screen.getByTestId('next-button');
    fireEvent.press(nextButton);

    // Should show second slide content
    expect(screen.getByText('Learn Smarter')).toBeTruthy();
    
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

    expect(screen.getByText('Welcome to Osmisis')).toBeTruthy();
  });

  it('navigates to /onboard when clicking Skip', () => {
    render(<WelcomeScreen />);
    
    fireEvent.press(screen.getByText('Skip'));
    expect(mockPush).toHaveBeenCalledWith('/onboard');
  });

  it('changes button to "Get Started" on the last slide and navigates', () => {
    render(<WelcomeScreen />);
    
    const nextButton = screen.getByTestId('next-button');
    
    // Click through to the last slide (3 slides total)
    fireEvent.press(nextButton); // To Slide 2
    fireEvent.press(nextButton); // To Slide 3

    // Check for "Get Started" text
    expect(screen.getByText('Get Started')).toBeTruthy();

    // Click it
    fireEvent.press(nextButton);
    expect(mockPush).toHaveBeenCalledWith('/onboard');
  });
});