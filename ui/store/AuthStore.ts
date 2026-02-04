import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { Platform } from 'react-native';

// 1. Define the Storage Adapter FIRST
// For web platform, use localStorage
const webStorage: StateStorage = {
  getItem: (name: string): string | null => {
    // localStorage is synchronous, but Zustand handles it fine
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

// For native platforms, use SecureStore (dynamically imported to avoid web issues)
const nativeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return webStorage.getItem(name);
    }
    const SecureStore = require("expo-secure-store");
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webStorage.setItem(name, value);
      return;
    }
    const SecureStore = require("expo-secure-store");
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webStorage.removeItem(name);
      return;
    }
    const SecureStore = require("expo-secure-store");
    await SecureStore.deleteItemAsync(name);
  },
};

const storageAdapter = Platform.OS === 'web' ? webStorage : nativeStorage;

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