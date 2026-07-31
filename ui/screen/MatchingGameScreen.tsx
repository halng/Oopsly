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

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { fetchCardsDataBySubjectAndShelf } from '@/services/CardService';

import { uiTokens } from '@/constants/uiTokens';

type MatchingGameScreenProps = {
  shelfId: string;
  subjectId: string;
};

type MatchItem = {
  id: string;
  text: string;
  matched: boolean;
};

type FlashState = { id: string; type: 'match' | 'wrong' } | null;

const MatchingGameScreen = ({ shelfId, subjectId }: MatchingGameScreenProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fronts, setFronts] = useState<MatchItem[]>([]);
  const [backs, setBacks] = useState<MatchItem[]>([]);
  const [selectedFront, setSelectedFront] = useState<string | null>(null);
  const [selectedBack, setSelectedBack] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flashState, setFlashState] = useState<FlashState>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalPairs = useRef(0);

  useEffect(() => {
    setLoadError(null);
    fetchCardsDataBySubjectAndShelf(shelfId, subjectId)
      .then((res) => {
        if (res.isSuccess) {
          const raw = (res.data.entities ?? []).slice(0, 8);
          totalPairs.current = raw.length;
          setFronts(
            raw.map((c) => ({ id: c.id, text: c.front, matched: false })).sort(
              () => Math.random() - 0.5,
            ),
          );
          setBacks(
            raw.map((c) => ({ id: c.id, text: c.back, matched: false })).sort(
              () => Math.random() - 0.5,
            ),
          );
          if (raw.length > 0) {
            timerRef.current = setInterval(() => {
              setElapsedSeconds((s) => s + 1);
            }, 1000);
          }
        } else {
          setLoadError(res.message ?? 'Failed to load cards');
        }
      })
      .catch((err) => {
        console.error('MatchingGameScreen fetch error:', err);
        setLoadError(err?.message ?? 'Could not connect to server');
      })
      .finally(() => setIsLoading(false));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shelfId, subjectId]);

  useEffect(() => {
    if (selectedFront && selectedBack) {
      if (selectedFront === selectedBack) {
        setFlashState({ id: selectedFront, type: 'match' });
        setTimeout(() => {
          setMatchedPairs((prev) => {
            const next = new Set(prev).add(selectedFront);
            if (next.size === totalPairs.current) {
              setIsComplete(true);
              if (timerRef.current) clearInterval(timerRef.current);
            }
            return next;
          });
          setFronts((prev) =>
            prev.map((f) => (f.id === selectedFront ? { ...f, matched: true } : f)),
          );
          setBacks((prev) =>
            prev.map((b) => (b.id === selectedBack ? { ...b, matched: true } : b)),
          );
          setFlashState(null);
          setSelectedFront(null);
          setSelectedBack(null);
        }, 500);
      } else {
        setFlashState({ id: selectedFront, type: 'wrong' });
        setWrongAttempts((prev) => prev + 1);
        setTimeout(() => {
          setFlashState(null);
          setSelectedFront(null);
          setSelectedBack(null);
        }, 600);
      }
    }
  }, [selectedFront, selectedBack]);

  const getCellBg = (
    item: MatchItem,
    isSelected: boolean,
    side: 'front' | 'back',
  ): string => {
    if (item.matched) return uiTokens.colors.successLight;
    if (flashState?.id === item.id) {
      return flashState.type === 'match' ? uiTokens.colors.successLight : '#FEE2E2';
    }
    if (isSelected) return uiTokens.colors.primaryLight;
    return uiTokens.colors.card;
  };

  const getCellBorder = (
    item: MatchItem,
    isSelected: boolean,
  ): string => {
    if (item.matched) return uiTokens.colors.success;
    if (flashState?.id === item.id) {
      return flashState.type === 'match' ? uiTokens.colors.success : uiTokens.colors.error;
    }
    if (isSelected) return uiTokens.colors.primary;
    return uiTokens.colors.border;
  };

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="match-loading-state">
        <ActivityIndicator size="large" color={uiTokens.colors.primary} />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered} testID="match-error-state">
        <Text style={styles.resultsTitle}>Could not load</Text>
        <Text style={styles.resultsMeta}>{loadError}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
          testID="match-error-back-button"
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (totalPairs.current === 0) {
    return (
      <View style={styles.centered} testID="match-empty-state">
        <Text style={styles.resultsTitle}>No cards yet</Text>
        <Text style={styles.resultsMeta}>
          Add at least one card before playing Match.
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
          testID="match-empty-back-button"
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (isComplete) {
    const accuracy =
      totalPairs.current > 0
        ? Math.round((totalPairs.current / (totalPairs.current + wrongAttempts)) * 100)
        : 100;
    return (
      <View style={styles.centered} testID="match-results-screen">
        <Text style={styles.resultsEmoji}>🏆</Text>
        <Text style={styles.resultsTitle}>Completed!</Text>
        <Text style={styles.resultsTime}>Time: {formatTime(elapsedSeconds)}</Text>
        <Text style={styles.resultsAccuracy}>Accuracy: {accuracy}%</Text>
        <Text style={styles.resultsMeta}>
          {wrongAttempts} wrong attempt{wrongAttempts !== 1 ? 's' : ''}
        </Text>
        <View style={styles.resultsActions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
            testID="match-results-back-button"
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setMatchedPairs(new Set());
              setWrongAttempts(0);
              setIsComplete(false);
              setSelectedFront(null);
              setSelectedBack(null);
              setElapsedSeconds(0);
              setFronts((prev) =>
                [...prev]
                  .map((f) => ({ ...f, matched: false }))
                  .sort(() => Math.random() - 0.5),
              );
              setBacks((prev) =>
                [...prev]
                  .map((b) => ({ ...b, matched: false }))
                  .sort(() => Math.random() - 0.5),
              );
              timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
            }}
            testID="match-results-play-again-button"
          >
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, styles.contentMax]}
      testID="match-game-screen"
    >
      <View style={styles.header}>
        <Text style={styles.timerText} testID="match-timer">
          {formatTime(elapsedSeconds)}
        </Text>
        <Text style={styles.pairsText} testID="match-pairs-count">
          {matchedPairs.size} / {totalPairs.current} matched
        </Text>
      </View>

      <View style={styles.grid}>
        {/* Fronts column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Terms</Text>
          {fronts.map((item) => {
            const isSelected = selectedFront === item.id;
            return (
              <Pressable
                key={`front-${item.id}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: getCellBg(item, isSelected, 'front'),
                    borderColor: getCellBorder(item, isSelected),
                    opacity: item.matched ? 0.5 : 1,
                  },
                ]}
                onPress={() => {
                  if (item.matched || selectedBack !== null) return;
                  setSelectedFront(isSelected ? null : item.id);
                }}
                disabled={item.matched}
                testID={`match-front-${item.id}`}
              >
                <Text style={styles.cellText} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Backs column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Definitions</Text>
          {backs.map((item) => {
            const isSelected = selectedBack === item.id;
            return (
              <Pressable
                key={`back-${item.id}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: getCellBg(item, isSelected, 'back'),
                    borderColor: getCellBorder(item, isSelected),
                    opacity: item.matched ? 0.5 : 1,
                  },
                ]}
                onPress={() => {
                  if (item.matched || selectedFront === null) return;
                  setSelectedBack(isSelected ? null : item.id);
                }}
                disabled={item.matched}
                testID={`match-back-${item.id}`}
              >
                <Text style={styles.cellText} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            );
          })}
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
  contentMax: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.colors.background,
    padding: uiTokens.spacing.xl,
    gap: uiTokens.spacing.sm,
  },
  loadingText: {
    color: uiTokens.colors.textMuted,
    fontSize: 15,
    marginTop: uiTokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: uiTokens.spacing.md,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
  },
  pairsText: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    gap: uiTokens.spacing.sm,
  },
  column: {
    flex: 1,
    gap: uiTokens.spacing.sm,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: uiTokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
    textAlign: 'center',
  },
  cell: {
    borderWidth: 1.5,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.sm,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    ...uiTokens.shadow.card,
  },
  cellText: {
    fontSize: 13,
    color: uiTokens.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultsEmoji: {
    fontSize: 56,
    marginBottom: uiTokens.spacing.sm,
  },
  resultsTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: uiTokens.colors.textPrimary,
  },
  resultsTime: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.primary,
  },
  resultsAccuracy: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.success,
  },
  resultsMeta: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: uiTokens.spacing.sm,
    marginTop: uiTokens.spacing.lg,
  },
  primaryButton: {
    backgroundColor: uiTokens.colors.primary,
    paddingVertical: uiTokens.spacing.md,
    paddingHorizontal: uiTokens.spacing.xl,
    borderRadius: uiTokens.radius.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: uiTokens.colors.border,
    paddingVertical: uiTokens.spacing.md,
    paddingHorizontal: uiTokens.spacing.xl,
    borderRadius: uiTokens.radius.md,
    backgroundColor: uiTokens.colors.card,
  },
  secondaryButtonText: {
    color: uiTokens.colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default MatchingGameScreen;
