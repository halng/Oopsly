import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);