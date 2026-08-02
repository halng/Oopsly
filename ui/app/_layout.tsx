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
import { useAuthStore, useSettingsStore } from "@/store";
import { Logger } from "@/utils";
import { getRefreshTokenSecure } from "@/utils/secureTokens";
import { AuthService } from "@/services/AuthService";
import { getProfile } from "@/services/ProfileService";
import {
  View,
  ActivityIndicator,
  Text,
  Appearance,
  Platform,
} from "react-native";
import { uiTokens } from "@/constants/uiTokens";

const logger = Logger.extend("RootLayout");

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    if (Platform.OS !== "web") {
      if (theme === "system") {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(theme);
      }
    }
  }, [theme]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const checkAuthStatus = async () => {
      if (isCancelled) return;
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
            timeoutId = setTimeout(() => {
              if (!isCancelled) {
                logger.warn("Store hydration timeout after 5 seconds");
                resolve();
              }
            }, 5000);
          });

          // Wait for either hydration or timeout
          await Promise.race([hydrationPromise, timeoutPromise]);

          // Clean up timeout if hydration finished first
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }

        let currentAccessToken = useAuthStore.getState().accessToken;
        let currentRefreshToken = useAuthStore.getState().refreshToken;
        const currentUserEmail = useAuthStore.getState().userEmail;
        const clearAuth = useAuthStore.getState().clearAuth;
        const setAuthTokens = useAuthStore.getState().setAuthTokens;

        if (!currentRefreshToken) {
          const fromSecure = await getRefreshTokenSecure();
          if (fromSecure) {
            useAuthStore.setState({ refreshToken: fromSecure });
            currentRefreshToken = fromSecure;
          }
        }

        const syncThemeFromProfile = async () => {
          try {
            const profile = await getProfile();
            if (profile.isSuccess && profile.data?.settings) {
              useSettingsStore.getState().syncFromServer(profile.data.settings);
            }
          } catch {
            /* ignore */
          }
        };

        const refreshSession = async (): Promise<boolean> => {
          try {
            const response = await AuthService.RefreshToken(
              currentRefreshToken!,
              currentUserEmail,
            );
            if (response.isSuccess && response.data) {
              const { access_token, refresh_token } = response.data;
              setAuthTokens(access_token, refresh_token);
              logger.info("Token refreshed successfully");
              await syncThemeFromProfile();
              return true;
            }
            logger.error("Token refresh failed:", response.message);
            clearAuth();
            return false;
          } catch (refreshError) {
            logger.error("Token refresh error:", refreshError);
            clearAuth();
            return false;
          }
        };

        if (!currentRefreshToken || !currentUserEmail?.trim()) {
          logger.debug("No refresh token or email in storage");
          setIsReady(true);
          return;
        }

        if (!currentAccessToken) {
          logger.debug("Access token missing; refreshing with stored refresh token");
          await refreshSession();
          setIsReady(true);
          return;
        }

        logger.debug("Tokens found, validating...");

        try {
          await AuthService.ValidateToken();
          logger.info("Access token is valid");
          await syncThemeFromProfile();
        } catch {
          logger.warn("Access token validation failed, attempting refresh...");
          await refreshSession();
        }

        setIsReady(true);
      } catch (error) {
        logger.error("Error checking auth status:", error);
        const clearAuth = useAuthStore.getState().clearAuth;
        clearAuth();
        setIsReady(true);
      }
    };

    checkAuthStatus();

    // Cleanup function to cancel async operations and clear timers
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: uiTokens.surface.canvas,
        }}
        testID="auth-loading-screen"
      >
        <ActivityIndicator
          size="large"
          color={uiTokens.accent.default}
          testID="auth-loading-spinner"
        />
        <Text
          style={{ marginTop: 16, color: uiTokens.text.muted }}
          testID="auth-loading-text"
        >
          Loading...
        </Text>
      </View>
    );
  }

  logger.debug("RootLayout rendered, isAuthenticated:", isAuthenticated);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 220,
        gestureEnabled: true,
      }}
    >
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen
          name="(user)"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
      </Stack.Protected>

      <Stack.Screen name="index" />
      <Stack.Screen
        name="onboard"
        options={{
          animation: "slide_from_right",
          contentStyle: { flex: 1, backgroundColor: uiTokens.surface.canvas },
        }}
      />
      <Stack.Screen
        name="verification"
        options={{
          animation: "slide_from_right",
          contentStyle: { flex: 1, backgroundColor: uiTokens.surface.canvas },
        }}
      />
    </Stack>
  );
}
