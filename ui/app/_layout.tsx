/*
 *    Copyright 2025 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import "react-native-reanimated";
import "@/global.css";
import { useAuthStore } from "@/store";
import { Logger } from "@/utils";
import { AuthService } from "@/services/AuthService";
import { View, ActivityIndicator, Text } from "react-native";

const logger = Logger.extend("RootLayout");

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const checkAuthStatus = async () => {
      logger.debug("Checking auth status...");
      
      try {
        // Wait for store to hydrate with timeout
        if (!useAuthStore.persist.hasHydrated()) {
          logger.debug("Waiting for store hydration...");
          
          const hydrationPromise = new Promise<void>((resolve) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              logger.debug("Store hydrated");
              unsub();
              resolve();
            });
          });

          const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              logger.warn("Store hydration timeout after 5 seconds");
              resolve();
            }, 5000);
          });

          // Wait for either hydration or timeout
          await Promise.race([hydrationPromise, timeoutPromise]);
        }

        const currentAccessToken = useAuthStore.getState().accessToken;
        const currentRefreshToken = useAuthStore.getState().refreshToken;
        const currentUserEmail = useAuthStore.getState().userEmail;
        const clearAuth = useAuthStore.getState().clearAuth;
        const setAuthTokens = useAuthStore.getState().setAuthTokens;

        if (!currentAccessToken || !currentRefreshToken) {
          logger.debug("No tokens found in storage");
          setIsReady(true);
          return;
        }

        logger.debug("Tokens found, validating...");
        
        try {
          // Try to validate the current access token
          await AuthService.ValidateToken();
          logger.info("Access token is valid");
          setIsReady(true);
        } catch {
          logger.warn("Access token validation failed, attempting refresh...");
          
          try {
            // Try to refresh the token
            const response = await AuthService.RefreshToken(currentRefreshToken, currentUserEmail);
            
            if (response.isSuccess && response.data) {
              const { access_token, refresh_token } = response.data;
              setAuthTokens(access_token, refresh_token);
              logger.info("Token refreshed successfully");
            } else {
              logger.error("Token refresh failed:", response.message);
              clearAuth();
            }
          } catch (refreshError) {
            logger.error("Token refresh error:", refreshError);
            clearAuth();
          }
          
          setIsReady(true);
        }
      } catch (error) {
        logger.error("Error checking auth status:", error);
        const clearAuth = useAuthStore.getState().clearAuth;
        clearAuth();
        setIsReady(true);
      }
    };

    checkAuthStatus();
  }, []);

  // Redirect based on authentication status
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(user)";

    if (!isAuthenticated && inAuthGroup) {
      // Redirect to onboarding if not authenticated
      router.replace("/");
    } else if (isAuthenticated && !inAuthGroup) {
      // Redirect to home if authenticated
      router.replace("/home");
    }
  }, [isAuthenticated, segments, isReady, router]);

  // Show loading screen while checking auth
  if (!isReady) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        testID="auth-loading-screen"
      >
        <ActivityIndicator size="large" color="#5B5BFD" testID="auth-loading-spinner" />
        <Text style={{ marginTop: 16, color: "#6B7280" }} testID="auth-loading-text">
          Loading...
        </Text>
      </View>
    );
  }

  logger.debug("RootLayout rendered, isAuthenticated:", isAuthenticated);

  //TODO: add theme provider when themes are ready
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(user)" options={{ headerShown: false }} />
      </Stack.Protected>
      
      <Stack.Screen name="index" />
    </Stack>
  );
}
