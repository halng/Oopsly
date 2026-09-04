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

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  deleteRefreshTokenSecure,
  getRefreshTokenSecure,
  saveRefreshTokenSecure,
} from '../../utils/secureTokens';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve('stored-token')),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('secureTokens', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.clearAllMocks();
  });

  it('skips secure save on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    await saveRefreshTokenSecure('token');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('saves refresh token on native', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await saveRefreshTokenSecure('token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'oopsly_refresh_token_v1',
      'token',
    );
  });

  it('returns null for refresh token on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    await expect(getRefreshTokenSecure()).resolves.toBeNull();
  });

  it('reads refresh token on native', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    await expect(getRefreshTokenSecure()).resolves.toBe('stored-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalled();
  });

  it('returns null when secure read fails', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(getRefreshTokenSecure()).resolves.toBeNull();
  });

  it('deletes refresh token on native', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await deleteRefreshTokenSecure();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('oopsly_refresh_token_v1');
  });

  it('skips delete on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    await deleteRefreshTokenSecure();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
