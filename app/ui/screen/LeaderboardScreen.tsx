/*
 *    Copyright 2026 Hao Nguyen Tan
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

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Flame, Trophy, Zap } from "lucide-react-native";
import { getUserStats, UserStats } from "@/services/UserService";
import { getProfile } from "@/services/ProfileService";
import { useAuthStore } from "@/store/AuthStore";
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { uiTokens } from "@/constants/uiTokens";
import { MAX_READING_WIDTH } from "@/utils/responsiveLayout";

type PlaceholderEntry = {
  rank: number;
  displayName: string;
  totalXp: number;
  dailyStreak: number;
  isCurrentUser?: boolean;
  isPlaceholder?: boolean;
};

/** Demo neighbors until a real GET /leaderboard API exists. */
const PLACEHOLDER_NEIGHBORS: Omit<PlaceholderEntry, "rank" | "isCurrentUser">[] = [
  { displayName: "Ava Chen", totalXp: 2450, dailyStreak: 21, isPlaceholder: true },
  { displayName: "Marcus Lee", totalXp: 1980, dailyStreak: 14, isPlaceholder: true },
  { displayName: "Sofia Ruiz", totalXp: 1620, dailyStreak: 9, isPlaceholder: true },
  { displayName: "Noah Patel", totalXp: 980, dailyStreak: 5, isPlaceholder: true },
  { displayName: "Emma Brooks", totalXp: 640, dailyStreak: 3, isPlaceholder: true },
];

function buildPreviewRows(
  displayName: string,
  stats: UserStats,
): PlaceholderEntry[] {
  const me: PlaceholderEntry = {
    rank: 0,
    displayName: displayName || "You",
    totalXp: stats.totalXp ?? 0,
    dailyStreak: stats.dailyStreak ?? 0,
    isCurrentUser: true,
  };
  const combined = [...PLACEHOLDER_NEIGHBORS, me].sort(
    (a, b) => b.totalXp - a.totalXp,
  );
  return combined.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

const LeaderboardScreen = () => {
  const router = useRouter();
  const userEmail = useAuthStore((s) => s.userEmail);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([getUserStats(), getProfile()])
      .then(([statsRes, profileRes]) => {
        if (statsRes.isSuccess && statsRes.data) {
          setStats(statsRes.data);
        } else {
          setError(statsRes.message ?? "Failed to load stats");
        }
        if (profileRes.isSuccess && profileRes.data?.displayName) {
          setDisplayName(profileRes.data.displayName);
        } else if (userEmail) {
          setDisplayName(userEmail.split("@")[0]);
        }
      })
      .catch(() => setError("Could not connect to server"))
      .finally(() => setIsLoading(false));
  }, [userEmail]);

  const rows = useMemo(() => {
    if (!stats) return [];
    return buildPreviewRows(displayName, stats);
  }, [displayName, stats]);

  const myRank = rows.find((r) => r.isCurrentUser)?.rank ?? "—";

  if (isLoading) {
    return (
      <ScreenContainer testID="leaderboard-loading-state">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={uiTokens.colors.primary} />
          <Text style={styles.muted}>Loading leaderboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scrollable={false}
      contentMaxWidth={MAX_READING_WIDTH}
      testID="leaderboard-screen"
    >
      <ScreenHeader
        title="Leaderboard"
        subtitle="Social ranks preview"
        onBack={() => router.back()}
        testID="leaderboard-header"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="leaderboard-scroll"
      >
        {error && (
          <FeedbackMessage message={error} tone="error" testID="leaderboard-error" />
        )}

        <View style={styles.banner} testID="leaderboard-preview-banner">
          <Text style={styles.bannerText}>
            Preview rankings — live ranks coming soon
          </Text>
        </View>

        {stats && (
          <View style={styles.standingCard} testID="your-standing-card">
            <Text style={styles.standingTitle}>Your standing</Text>
            <View style={styles.standingRow}>
              <View style={styles.statBlock}>
                <Trophy size={18} color={uiTokens.colors.warning} />
                <Text style={styles.statValue} testID="standing-rank">
                  #{myRank}
                </Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
              <View style={styles.statBlock}>
                <Zap size={18} color={uiTokens.colors.xp} />
                <Text style={styles.statValue} testID="standing-xp">
                  {stats.totalXp}
                </Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
              <View style={styles.statBlock}>
                <Flame size={18} color={uiTokens.colors.streak} />
                <Text style={styles.statValue} testID="standing-streak">
                  {stats.dailyStreak}
                </Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
            <Text style={styles.standingMeta} testID="standing-meta">
              {stats.cardsReviewedToday} reviewed today ·{" "}
              {Math.round(stats.retentionRate)}% retention
            </Text>
          </View>
        )}

        <Text style={styles.listHeading}>This week (preview)</Text>
        {rows.map((entry) => (
          <View
            key={`${entry.rank}-${entry.displayName}`}
            style={[
              styles.row,
              entry.isCurrentUser && styles.rowCurrent,
            ]}
            testID={
              entry.isCurrentUser
                ? "leaderboard-row-current"
                : `leaderboard-row-${entry.rank}`
            }
          >
            <Text style={styles.rank}>#{entry.rank}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName} numberOfLines={1}>
                {entry.displayName}
                {entry.isCurrentUser ? " (you)" : ""}
              </Text>
              <Text style={styles.rowMeta}>
                {entry.totalXp} XP · {entry.dailyStreak} day streak
                {entry.isPlaceholder ? " · demo" : ""}
              </Text>
            </View>
          </View>
        ))}

        <Pressable
          style={styles.statsLink}
          onPress={() => router.push("/stats")}
          testID="leaderboard-stats-link"
        >
          <Text style={styles.statsLinkText}>View full personal stats</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  muted: {
    color: uiTokens.colors.textMuted,
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: uiTokens.spacing.xxl,
    gap: 12,
  },
  banner: {
    backgroundColor: uiTokens.colors.primaryLight,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
  },
  bannerText: {
    color: uiTokens.colors.primaryDark,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  standingCard: {
    backgroundColor: uiTokens.colors.card,
    borderRadius: uiTokens.radius.lg,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    padding: uiTokens.spacing.md,
    ...uiTokens.shadow.card,
  },
  standingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: uiTokens.colors.textPrimary,
    marginBottom: 12,
  },
  standingRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBlock: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: uiTokens.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  standingMeta: {
    marginTop: 12,
    textAlign: "center",
    color: uiTokens.colors.textMuted,
    fontSize: 13,
  },
  listHeading: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: uiTokens.colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: uiTokens.colors.card,
    borderRadius: uiTokens.radius.md,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    padding: uiTokens.spacing.md,
    gap: 12,
  },
  rowCurrent: {
    borderColor: uiTokens.colors.primary,
    backgroundColor: uiTokens.colors.primaryLight,
  },
  rank: {
    width: 40,
    fontWeight: "800",
    color: uiTokens.colors.primary,
    fontSize: 15,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "700",
    color: uiTokens.colors.textPrimary,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  statsLink: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  statsLinkText: {
    color: uiTokens.colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default LeaderboardScreen;
