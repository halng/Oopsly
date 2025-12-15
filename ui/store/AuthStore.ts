import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthState {
  isAuthenticated: boolean;
  userEmail: string;
  accessToken: string;
  refreshToken: string;

  setUserEmail: (email: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setAuthTokens: (accessToken: string, refreshToken: string) => void;
  setCredentials: (email: string, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userEmail: "",
      accessToken: "",
      refreshToken: "",

      setUserEmail: (email: string) => set({ userEmail: email }),
      setIsAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),
      setAuthTokens: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setCredentials: (email: string, accessToken: string, refreshToken: string) =>
        set({ userEmail: email, accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          accessToken: "",
          refreshToken: "",
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
