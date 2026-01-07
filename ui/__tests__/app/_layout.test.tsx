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

import { useAuthStore } from '@/store';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '../../app/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  // Give the main component a name
  const Stack = ({ children }: { children: React.ReactNode }) => {
    return <View testID="stack-wrapper">{children}</View>;
  };
  Stack.displayName = 'Stack';

  // Use named functions for sub-components
  Stack.Screen = function StackScreen({ name }: { name: string }) {
    return <View testID={`screen-${name}`} />;
  };

  Stack.Protected = function StackProtected({ guard, children }: { guard: boolean; children: React.ReactNode }) {
    return guard ? <>{children}</> : null;
  };

  return { Stack };
});
jest.mock('@/store', () => ({
  useAuthStore: jest.fn(),
}));

describe('<RootLayout />', () => {
  it('should ONLY render the public index screen when unauthenticated', () => {
    // ARRANGE: Mock the store selector to return false
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ isAuthenticated: false })
    );

    render(<RootLayout />);
    expect(screen.getByTestId('screen-index')).toBeTruthy();
    
    expect(screen.queryByTestId('screen-(user)')).toBeNull();
  });

  it('should render the protected (user) group when authenticated', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ isAuthenticated: true })
    );

    render(<RootLayout />);
    expect(screen.getByTestId('screen-(user)')).toBeTruthy();

    expect(screen.getByTestId('screen-index')).toBeTruthy();
  });
});