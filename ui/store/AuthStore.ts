import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { Platform } from 'react-native';

// 1. Define the Storage Adapter based on platform
let storageAdapter: StateStorage;

if (Platform.OS === 'web') {
  // For web platform, use localStorage directly (synchronous)
  storageAdapter = {
    getItem: (name: string): string | null => {
      try {
        return localStorage.getItem(name);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    },
  };
} else {
  // For native platforms (iOS/Android), use SecureStore (asynchronous)
  storageAdapter = {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const SecureStore = require("expo-secure-store");
        return await SecureStore.getItemAsync(name);
      } catch (error) {
        console.error('Error reading from SecureStore:', error);
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const SecureStore = require("expo-secure-store");
        await SecureStore.setItemAsync(name, value);
      } catch (error) {
        console.error('Error writing to SecureStore:', error);
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        const SecureStore = require("expo-secure-store");
        await SecureStore.deleteItemAsync(name);
      } catch (error) {
        console.error('Error removing from SecureStore:', error);
      }
    },
  };
}

// 2. Define your Interface
interface AuthState {
  isAuthenticated: boolean;
  userEmail: string;
  accessToken: string;
  refreshToken: string;

  setUserEmail: (email: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setAuthTokens: (accessToken: string, refreshToken: string) => void;
  setCredentials: (
    email: string,
    accessToken: string,
    refreshToken: string
  ) => void;
  clearAuth: () => void;
}

// 3. Create the Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userEmail: "",
      accessToken: "",
      refreshToken: "",

      setAuthTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setCredentials: (email, accessToken, refreshToken) =>
        set({
          userEmail: email,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          accessToken: "",
          refreshToken: "",
        }),

      setUserEmail: (email) => set({ userEmail: email }),
      setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => storageAdapter),
    }
  )
);