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

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { getUserStats, UserStats } from '@/services/UserService';
import { uiTokens } from '@/constants/uiTokens';

const MOCK_WEEKLY_DATA = [
  { value: 12, label: 'Mon', frontColor: uiTokens.colors.primary },
  { value: 8, label: 'Tue', frontColor: uiTokens.colors.primary },
  { value: 20, label: 'Wed', frontColor: uiTokens.colors.primary },
  { value: 15, label: 'Thu', frontColor: uiTokens.colors.primary },
  { value: 25, label: 'Fri', frontColor: uiTokens.colors.primary },
  { value: 18, label: 'Sat', frontColor: uiTokens.colors.primary },
  { value: 30, label: 'Sun', frontColor: uiTokens.colors.accent },
];

const retentionColor = (rate: number): string => {
  if (rate >= 80) return uiTokens.colors.success;
  if (rate >= 60) return uiTokens.colors.warning;
  return uiTokens.colors.error;
};

const StatsScreen = () => {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserStats()
      .then((res) => {
        if (res.isSuccess) {
          setStats(res.data);
        } else {
          setError(res.message || 'Failed to load stats');
        }
      })
      .catch(() => setError('Could not connect to server'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered} testID="stats-loading-state">
        <ActivityIndicator size="large" color={uiTokens.colors.primary} />
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered} testID="stats-error-state">
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const level = stats ? Math.floor(stats.totalXp / 100) + 1 : 1;
  const retention = stats?.retentionRate ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="stats-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <Text style={styles.headerSubtitle}>Your learning overview</Text>
        <Pressable
          onPress={() => router.push('/leaderboard')}
          style={styles.leaderboardLink}
          testID="stats-leaderboard-link"
        >
          <Text style={styles.leaderboardLinkText}>View leaderboard preview</Text>
        </Pressable>
      </View>

      {/* Top row: Streak + XP */}
      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]} testID="stats-streak-card">
          <Text style={styles.cardEmoji}>🔥</Text>
          <Text style={[styles.cardValue, { color: uiTokens.colors.streak }]}>
            {stats?.dailyStreak ?? 0}
          </Text>
          <Text style={styles.cardLabel}>day streak</Text>
        </View>

        <View style={[styles.card, styles.halfCard]} testID="stats-xp-card">
          <Text style={styles.cardEmoji}>⭐</Text>
          <Text style={[styles.cardValue, { color: uiTokens.colors.xp }]}>
            {stats?.totalXp ?? 0}
          </Text>
          <Text style={styles.cardLabel}>total XP</Text>
          <Text style={styles.cardSublabel}>Level {level}</Text>
        </View>
      </View>

      {/* Card counts row */}
      <View style={styles.row}>
        <View style={[styles.card, styles.thirdCard]} testID="stats-reviewed-today-card">
          <Text style={styles.statNumber}>{stats?.cardsReviewedToday ?? 0}</Text>
          <Text style={styles.statLabel}>Reviewed{'\n'}today</Text>
        </View>
        <View style={[styles.card, styles.thirdCard]} testID="stats-total-cards-card">
          <Text style={styles.statNumber}>{stats?.totalCards ?? 0}</Text>
          <Text style={styles.statLabel}>Total{'\n'}cards</Text>
        </View>
        <View style={[styles.card, styles.thirdCard]} testID="stats-due-cards-card">
          <Text style={[styles.statNumber, { color: uiTokens.colors.accent }]}>
            {stats?.dueCards ?? 0}
          </Text>
          <Text style={styles.statLabel}>Due{'\n'}now</Text>
        </View>
      </View>

      {/* Retention rate */}
      <View style={[styles.card, styles.fullCard]} testID="stats-retention-card">
        <View style={styles.retentionRow}>
          <View>
            <Text style={styles.retentionLabel}>Retention rate</Text>
            <Text style={styles.retentionSublabel}>Cards recalled correctly</Text>
          </View>
          <Text style={[styles.retentionValue, { color: retentionColor(retention) }]}>
            {Math.round(retention)}%
          </Text>
        </View>
        <View style={styles.retentionBarBg}>
          <View
            style={[
              styles.retentionBarFill,
              {
                width: `${Math.min(retention, 100)}%`,
                backgroundColor: retentionColor(retention),
              },
            ]}
          />
        </View>
      </View>

      {/* Weekly chart */}
      <View style={[styles.card, styles.fullCard]} testID="stats-weekly-chart-card">
        <Text style={styles.chartTitle}>Weekly Reviews</Text>
        <Text style={styles.chartSubtitle}>Cards reviewed per day</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={MOCK_WEEKLY_DATA}
            barWidth={28}
            spacing={16}
            roundedTop
            roundedBottom={false}
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: uiTokens.colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: uiTokens.colors.textMuted, fontSize: 10 }}
            noOfSections={4}
            maxValue={40}
            isAnimated
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  content: {
    padding: uiTokens.spacing.md,
    paddingBottom: uiTokens.spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.colors.background,
    gap: uiTokens.spacing.md,
  },
  loadingText: {
    color: uiTokens.colors.textMuted,
    fontSize: 15,
  },
  errorText: {
    color: uiTokens.colors.error,
    fontSize: 15,
    textAlign: 'center',
  },
  header: {
    marginBottom: uiTokens.spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: uiTokens.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    marginTop: 2,
  },
  leaderboardLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  leaderboardLinkText: {
    color: uiTokens.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: uiTokens.spacing.sm,
    marginBottom: uiTokens.spacing.sm,
  },
  card: {
    backgroundColor: uiTokens.colors.card,
    borderRadius: uiTokens.radius.lg,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    padding: uiTokens.spacing.md,
    ...uiTokens.shadow.card,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: uiTokens.spacing.lg,
  },
  thirdCard: {
    flex: 1,
    alignItems: 'center',
  },
  fullCard: {
    marginBottom: uiTokens.spacing.sm,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: uiTokens.spacing.xs,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  cardLabel: {
    fontSize: 13,
    color: uiTokens.colors.textMuted,
    marginTop: 2,
  },
  cardSublabel: {
    fontSize: 11,
    color: uiTokens.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: uiTokens.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  retentionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: uiTokens.spacing.sm,
  },
  retentionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
  },
  retentionSublabel: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    marginTop: 2,
  },
  retentionValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  retentionBarBg: {
    height: 8,
    backgroundColor: uiTokens.colors.border,
    borderRadius: uiTokens.radius.full,
    overflow: 'hidden',
  },
  retentionBarFill: {
    height: '100%',
    borderRadius: uiTokens.radius.full,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    marginBottom: uiTokens.spacing.md,
  },
  chartContainer: {
    overflow: 'hidden',
  },
});

export default StatsScreen;
