import { API_BASE_URL } from "@/constants/api";
import * as FileSystem from "expo-file-system";

export interface TutorTurnResult {
  sessionId: string;
  deckId: string;
  cardId: string;
  cardQuestion: string;
  userTranscript: string;
  tutorReply: string;
  tutorReplyAudioBase64: string;
  nextDueAt: string;
}

export async function sendAudioTurn(
  deckId: string,
  audioUri: string | null,
  userText: string,
  sessionId?: string,
  jwtToken?: string
): Promise<TutorTurnResult> {
  const formData = new FormData();
  formData.append("deckId", deckId);

  if (sessionId) {
    formData.append("sessionId", sessionId);
  }

  if (audioUri) {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (fileInfo.exists) {
      const blob = await fetch(audioUri).then((r) => r.blob());
      formData.append("audio", blob, "audio.wav");
    }
  }

  formData.append("text", userText);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/tutor/voice`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.message || `Tutor error: ${response.statusText}`
    );
  }

  return payload?.data as TutorTurnResult;
}
