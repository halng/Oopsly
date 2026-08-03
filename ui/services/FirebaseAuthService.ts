/*
 * Copyright 2026 Hao Nguyen Tan
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
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
  sendEmailLink(email: string) {
    return firebaseRequest("sendOobCode", {
      requestType: "EMAIL_SIGNIN",
      email,
      continueUrl: process.env.EXPO_PUBLIC_FIREBASE_EMAIL_LINK ?? "https://oopsly.web.app/verification",
      canHandleCodeInApp: true,
    });
  },
  async verifyEmailLink(email: string, oobCode: string) {
    session = await firebaseRequest<FirebaseSession>("signInWithEmailLink", { email, oobCode });
    return session;
  },
  async verifyPhoneCode(sessionInfo: string, code: string) {
    session = await firebaseRequest<FirebaseSession>("signInWithPhoneNumber", { sessionInfo, code });
    return session;
  },
  setPhoneSession(sessionInfo: string) {
    return sessionInfo;
  },
  async getIdToken() {
    if (!session) return null;
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
    });
    if (response.ok) {
      const refreshed = await response.json();
      session = { ...session, idToken: refreshed.id_token, refreshToken: refreshed.refresh_token };
    }
    return session.idToken;
  },
};
