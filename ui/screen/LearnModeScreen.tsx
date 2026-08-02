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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { fetchCardsDataBySubjectAndShelf } from '@/services/CardService';
import { CardRes } from '@/types/Card';
import { uiTokens } from '@/constants/uiTokens';

type LearnModeScreenProps = {
  shelfId: string;
  subjectId: string;
};

type Phase = 'multiple-choice' | 'written' | 'results';

const generateOptions = (currentCard: CardRes, allCards: CardRes[]): string[] => {
  const correct = currentCard.back;
  const pool = allCards.filter((c) => c.id !== currentCard.id).map((c) => c.back);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const opts = [correct, ...shuffled].sort(() => Math.random() - 0.5);
  return opts;
};

const LearnModeScreen = ({ shelfId, subjectId }: LearnModeScreenProps) => {
  const router = useRouter();

  const [cards, setCards] = useState<CardRes[]>([]);
  const [queue, setQueue] = useState<CardRes[]>([]);
  const [currentCard, setCurrentCard] = useState<CardRes | null>(null);
  const [phase, setPhase] = useState<Phase>('multiple-choice');
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [masteredCount, setMasteredCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mcPhase, setMcPhase] = useState<Set<string>>(new Set());

  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fadeOpacity = useSharedValue(1);
  const masteredBadgeOpacity = useSharedValue(0);
  const masteredBadgeScale = useSharedValue(0.6);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  const masteredBadgeStyle = useAnimatedStyle(() => ({
    opacity: masteredBadgeOpacity.value,
    transform: [{ scale: masteredBadgeScale.value }],
  }));

  const transitionTo = useCallback(
    (nextPhase: Phase, nextCard: CardRes | null, nextOptions: string[]) => {
      fadeOpacity.value = withTiming(0, { duration: 150 }, () => {
        fadeOpacity.value = withTiming(1, { duration: 200 });
      });
      pendingTimeouts.current.push(
        setTimeout(() => {
          setPhase(nextPhase);
          setCurrentCard(nextCard);
          setOptions(nextOptions);
          setSelected(null);
          setWrittenAnswer('');
        }, 150),
      );
    },
    [fadeOpacity],
  );

  useEffect(() => {
    setLoadError(null);
    fetchCardsDataBySubjectAndShelf(shelfId, subjectId)
      .then((res) => {
        if (res.isSuccess) {
          const fetched = res.data.entities ?? [];
          setCards(fetched);
          if (fetched.length > 0) {
            setQueue([...fetched]);
            const first = fetched[0];
            setCurrentCard(first);
            setOptions(generateOptions(first, fetched));
            setPhase('multiple-choice');
          } else {
            setPhase('results');
          }
        } else {
          setLoadError(res.message ?? 'Failed to load cards');
        }
      })
      .catch((err) => {
        console.error('LearnModeScreen fetch error:', err);
        setLoadError(err?.message ?? 'Could not connect to server');
      })
      .finally(() => setIsLoading(false));
  }, [shelfId, subjectId]);

  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const handleMultipleChoiceSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);

    const isCorrect = currentCard ? option === currentCard.back : false;
    if (!isCorrect) {
      setWrongCount((prev) => prev + 1);
    }

    pendingTimeouts.current.push(
      setTimeout(() => {
        if (isCorrect) {
          setMcPhase((prev) => new Set(prev).add(currentCard!.id));
          transitionTo('written', currentCard, []);
        } else {
          const remaining = queue.filter((c) => c.id !== currentCard?.id);
          const reshuffled = currentCard ? [...remaining, currentCard] : remaining;
          const next = reshuffled[0] ?? null;
          setQueue(reshuffled);
          transitionTo(
            'multiple-choice',
            next,
            next ? generateOptions(next, cards) : [],
          );
        }
      }, 800),
    );
  };

  const handleWrittenCheck = () => {
    if (!currentCard) return;
    const isCorrect =
      writtenAnswer.trim().toLowerCase() === currentCard.back.trim().toLowerCase();

    if (!isCorrect) {
      setWrongCount((prev) => prev + 1);
      transitionTo('written', currentCard, []);
      return;
    }

    masteredBadgeOpacity.value = withTiming(1, { duration: 200 });
    masteredBadgeScale.value = withTiming(1, { duration: 200 });
    pendingTimeouts.current.push(
      setTimeout(() => {
        masteredBadgeOpacity.value = withTiming(0, { duration: 200 });
        masteredBadgeScale.value = withTiming(0.6, { duration: 200 });
      }, 1200),
    );

    const newMastered = masteredCount + 1;
    setMasteredCount(newMastered);
    const newQueue = queue.filter((c) => c.id !== currentCard.id);
    setQueue(newQueue);

    pendingTimeouts.current.push(
      setTimeout(() => {
        if (newQueue.length === 0) {
          setPhase('results');
          return;
        }
        const next = newQueue[0];
        const nextPhase: Phase = mcPhase.has(next.id) ? 'written' : 'multiple-choice';
        transitionTo(
          nextPhase,
          next,
          nextPhase === 'multiple-choice' ? generateOptions(next, cards) : [],
        );
      }, 1400),
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer} testID="learn-loading-state">
        <ActivityIndicator size="large" color={uiTokens.colors.primary} />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centeredContainer} testID="learn-error-state">
        <Text style={styles.resultsTitle}>Could not load</Text>
        <Text style={styles.resultsMeta}>{loadError}</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          testID="learn-error-back-button"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'results') {
    if (cards.length === 0) {
      return (
        <View style={styles.resultsContainer} testID="learn-empty-state">
          <Text style={styles.resultsTitle}>No cards yet</Text>
          <Text style={styles.resultsMeta}>
            Add cards to this subject before starting Learn mode.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            testID="learn-empty-back-button"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.resultsContainer} testID="learn-results-screen">
        <Text style={styles.resultsEmoji}>🎉</Text>
        <Text style={styles.resultsTitle}>Well done!</Text>
        <Text style={styles.resultsSubtitle}>
          {masteredCount} / {cards.length} cards mastered
        </Text>
        <Text style={styles.resultsMeta}>
          {wrongCount} wrong attempt{wrongCount !== 1 ? 's' : ''} along the way
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          testID="learn-results-back-button"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const progress = cards.length > 0 ? masteredCount / cards.length : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, styles.contentMax]}
      keyboardShouldPersistTaps="handled"
      testID="learn-mode-screen"
    >
      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel} testID="learn-progress-label">
          {masteredCount} / {cards.length} mastered
        </Text>
      </View>

      {/* Card */}
      <Animated.View style={[styles.card, fadeStyle]} testID="learn-card">
        <Text style={styles.cardPhaseLabel}>
          {phase === 'multiple-choice' ? 'Multiple Choice' : 'Written'}
        </Text>
        <Text style={styles.cardQuestion}>{currentCard?.front}</Text>
      </Animated.View>

      {/* Mastered badge */}
      <Animated.View style={[styles.masteredBadge, masteredBadgeStyle]} testID="learn-mastered-badge">
        <Text style={styles.masteredBadgeText}>Mastered!</Text>
      </Animated.View>

      {/* Answer section */}
      {phase === 'multiple-choice' ? (
        <View style={styles.optionsContainer} testID="learn-options-container">
          {options.map((opt, i) => {
            const isSelected = selected === opt;
            const isCorrect = currentCard ? opt === currentCard.back : false;
            let bg: string = uiTokens.colors.card;
            let borderColor: string = uiTokens.colors.border;
            if (isSelected) {
              bg = isCorrect ? uiTokens.colors.successLight : '#FEE2E2';
              borderColor = isCorrect ? uiTokens.colors.success : uiTokens.colors.error;
            }
            return (
              <Pressable
                key={i}
                style={[styles.optionButton, { backgroundColor: bg, borderColor }]}
                onPress={() => handleMultipleChoiceSelect(opt)}
                testID={`learn-option-${i}`}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && {
                      color: isCorrect ? uiTokens.colors.success : uiTokens.colors.error,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.writtenContainer} testID="learn-written-container">
          <TextInput
            style={styles.writtenInput}
            placeholder="Type your answer..."
            placeholderTextColor={uiTokens.colors.textMuted}
            value={writtenAnswer}
            onChangeText={setWrittenAnswer}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleWrittenCheck}
            blurOnSubmit
            testID="learn-written-input"
          />
          <Pressable
            style={styles.checkButton}
            onPress={handleWrittenCheck}
            testID="learn-check-button"
          >
            <Text style={styles.checkButtonText}>Check</Text>
          </Pressable>
        </View>
      )}
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
  centeredContainer: {
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
  progressSection: {
    marginBottom: uiTokens.spacing.lg,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: uiTokens.colors.border,
    borderRadius: uiTokens.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: uiTokens.colors.primary,
    borderRadius: uiTokens.radius.full,
  },
  progressLabel: {
    marginTop: uiTokens.spacing.sm,
    fontSize: 13,
    color: uiTokens.colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: uiTokens.colors.card,
    borderRadius: uiTokens.radius.xl,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    padding: uiTokens.spacing.lg,
    marginBottom: uiTokens.spacing.md,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    ...uiTokens.shadow.card,
  },
  cardPhaseLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: uiTokens.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: uiTokens.spacing.sm,
    backgroundColor: uiTokens.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: uiTokens.radius.full,
    overflow: 'hidden',
  },
  cardQuestion: {
    fontSize: 22,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  masteredBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: uiTokens.colors.success,
    paddingHorizontal: uiTokens.spacing.lg,
    paddingVertical: uiTokens.spacing.sm,
    borderRadius: uiTokens.radius.full,
    zIndex: 10,
  },
  masteredBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  optionsContainer: {
    gap: uiTokens.spacing.sm,
  },
  optionButton: {
    borderWidth: 1.5,
    borderRadius: uiTokens.radius.md,
    paddingVertical: uiTokens.spacing.md,
    paddingHorizontal: uiTokens.spacing.md,
  },
  optionText: {
    fontSize: 15,
    color: uiTokens.colors.textPrimary,
    textAlign: 'center',
  },
  writtenContainer: {
    gap: uiTokens.spacing.sm,
  },
  writtenInput: {
    borderWidth: 1.5,
    borderColor: uiTokens.colors.border,
    borderRadius: uiTokens.radius.md,
    paddingVertical: uiTokens.spacing.md,
    paddingHorizontal: uiTokens.spacing.md,
    fontSize: 15,
    color: uiTokens.colors.textPrimary,
    backgroundColor: uiTokens.colors.card,
  },
  checkButton: {
    backgroundColor: uiTokens.colors.primary,
    borderRadius: uiTokens.radius.md,
    paddingVertical: uiTokens.spacing.md,
    alignItems: 'center',
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: uiTokens.spacing.xl,
    gap: uiTokens.spacing.sm,
  },
  resultsEmoji: {
    fontSize: 56,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: uiTokens.colors.textPrimary,
  },
  resultsSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.primary,
  },
  resultsMeta: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  backButton: {
    marginTop: uiTokens.spacing.lg,
    backgroundColor: uiTokens.colors.primary,
    paddingVertical: uiTokens.spacing.md,
    paddingHorizontal: uiTokens.spacing.xl,
    borderRadius: uiTokens.radius.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default LearnModeScreen;
