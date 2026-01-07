import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  userEmail: string;
  token?: string;

  setUserEmail: (email: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userEmail: "",
  token: undefined,

  setUserEmail: (email: string) => set({ userEmail: email }),
  setIsAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),
  setToken: (token: string) => set({ token }),
}));
