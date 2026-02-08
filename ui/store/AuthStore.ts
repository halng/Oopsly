import { create } from "zustand";

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

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userEmail: "",
  accessToken: "",
  refreshToken: "",

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

  setUserEmail: (email: string) => set({ userEmail: email }),
  setIsAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),
}));
