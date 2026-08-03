/*
 * Copyright 2026 Hao Nguyen Tan
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store";

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
const PENDING_EMAIL_KEY = "firebase-pending-email";
const identityUrl = (method: string) =>
  `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${API_KEY}`;

type FirebaseSession = {
  idToken: string;
  refreshToken: string;
  email?: string;
  phoneNumber?: string;
  isNewUser?: boolean;
};

let session: FirebaseSession | null = null;

function isFirebaseIdToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = typeof globalThis.atob === "function"
      ? globalThis.atob(normalized)
      : "";
    return String(JSON.parse(decoded).iss).startsWith("https://securetoken.google.com/");
  } catch {
    return false;
  }
}

async function firebaseRequest<T>(method: string, body: object): Promise<T> {
  if (!API_KEY) throw new Error("Firebase API key is not configured");
  const response = await fetch(identityUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? "Firebase authentication failed");
  return data as T;
}

export const FirebaseAuthService = {
  async sendEmailLink(email: string) {
    await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
    return firebaseRequest("sendOobCode", {
      requestType: "EMAIL_SIGNIN",
      email,
      continueUrl: process.env.EXPO_PUBLIC_FIREBASE_EMAIL_LINK ?? "https://oopsly.web.app/verification",
      canHandleCodeInApp: true,
    });
  },
  async verifyEmailLink(email: string, oobCode: string) {
    session = await firebaseRequest<FirebaseSession>("signInWithEmailLink", { email, oobCode });
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
    return session;
  },
  getPendingEmail() {
    return AsyncStorage.getItem(PENDING_EMAIL_KEY);
  },
  startPhoneVerification(phoneNumber: string) {
    // Firebase validates the platform (reCAPTCHA on web, APNs/Play Integrity on
    // native) for this request and returns the session needed to verify the SMS.
    return firebaseRequest<{ sessionInfo: string }>("sendVerificationCode", { phoneNumber });
  },
  async verifyPhoneCode(sessionInfo: string, code: string) {
    session = await firebaseRequest<FirebaseSession>("signInWithPhoneNumber", { sessionInfo, code });
    return session;
  },
  setPhoneSession(sessionInfo: string) {
    return sessionInfo;
  },
  async getIdToken() {
    const stored = useAuthStore.getState();
    const refreshToken = session?.refreshToken
      || (isFirebaseIdToken(stored.accessToken) ? stored.refreshToken : "");
    if (!refreshToken) return null;
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    if (response.ok) {
      const refreshed = await response.json();
      session = {
        ...session,
        idToken: refreshed.id_token,
        refreshToken: refreshed.refresh_token,
      };
      useAuthStore.getState().setAuthTokens(session.idToken, session.refreshToken);
    }
    return session?.idToken ?? stored.accessToken ?? null;
  },
};
