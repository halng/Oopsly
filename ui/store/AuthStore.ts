import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Platform } from 'react-native';

// 1. Define the Storage Adapter FIRST
const nativeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

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
  // persist(
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
  //   {
  //     name: "auth-storage",
  //     storage: createJSONStorage(() => storageAdapter),
  //   }
  // )
);