import { create } from "zustand";
import { UUID } from "crypto";

export interface TutorSessionState {
  sessionId: string | null;
  deckId: string | null;
  isActive: boolean;
  isRecording: boolean;
  lastCardId: string | null;
  startSession: (deckId: string) => void;
  endSession: () => void;
  setRecording: (recording: boolean) => void;
  setLastCardId: (cardId: string) => void;
  setSessionId: (sessionId: string) => void;
}

export const useTutorSessionStore = create<TutorSessionState>((set) => ({
  sessionId: null,
  deckId: null,
  isActive: false,
  isRecording: false,
  lastCardId: null,

  startSession: (deckId: string) =>
    set({
      deckId,
      isActive: true,
      sessionId: null,
      isRecording: false,
    }),

  endSession: () =>
    set({
      sessionId: null,
      deckId: null,
      isActive: false,
      isRecording: false,
      lastCardId: null,
    }),

  setRecording: (recording: boolean) =>
    set({ isRecording: recording }),

  setLastCardId: (cardId: string) =>
    set({ lastCardId: cardId }),

  setSessionId: (sessionId: string) =>
    set({ sessionId }),
}));
