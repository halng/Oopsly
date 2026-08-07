/*
 * Copyright 2026 Hao Nguyen Tan
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  getIdToken,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZDEDFXdQSMw1Xu3gsl24y6hFDE0xZK88",
  authDomain: "oopsly-stg.firebaseapp.com",
  projectId: "oopsly-stg",
  storageBucket: "oopsly-stg.firebasestorage.app",
  messagingSenderId: "625413949582",
  appId: "1:625413949582:web:e0d893f146134608cf61df",
  measurementId: "G-2K7K6KGWSG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const actionCodeSettings = {
  url: "https://localhost:8081",
  handleCodeInApp: true,
};

export const sendEmailLink = (email: string) => {
  if (!email) {
    throw new Error("Email is required");
  }

  let host = "https://localhost:8081";
  if (process.env.EXPO_PUBLIC_ENV === "stg") {
    host = "https://oopsly-stg.firebaseapp.com";
  } else if (process.env.EXPO_PUBLIC_ENV === "prod") {
    host = "https://oopsly.firebaseapp.com";
  }


  actionCodeSettings.url = `${host}/verification?identifier=${encodeURIComponent(email)}&method=email`;

  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
};

export const verifyEmailLinkAndGetToken = (email: string, emailLink: string) => {
  if (!email || !emailLink) {
    throw new Error("Email and email link are required");
  }

  if (!isSignInWithEmailLink(auth, emailLink)) {
    throw new Error("Invalid email link");
  }
  return signInWithEmailLink(auth, email, emailLink).then((result) => {
    // User signed in successfully.
    const user = result.user;
    return getIdToken(user, true);
  }).catch((error) => {
    throw new Error(`Error signing in with email link: ${error}`);
  });
};
