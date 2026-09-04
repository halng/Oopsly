import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { X, RotateCcw, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import {
  fetchCardsDataBySubjectAndShelf,
  updateDifficultyLevels,
} from "@/services/CardService";
import { runTestPreset } from "@/services/TestSuiteService";
import { CardRes, ReviewedFlashcard, TestRunCardRes } from "@/types/Card";
import { uiTokens } from "@/constants/uiTokens";
import { useResponsiveLayout } from "@/utils/responsiveLayout";

type FlashcardReviewProps =
  | { _shelfId: string; _subjectId: string; _testSuiteId?: undefined }
  | { _shelfId: string; _testSuiteId: string; _subjectId?: undefined };

const FlashcardReviewScreen = (props: FlashcardReviewProps) => {
  const { _shelfId, _subjectId, _testSuiteId } = props;
  const isTestSuiteMode = Boolean(_testSuiteId && _shelfId);
  const startTime = Date.now();
  const router = useRouter();
  const { width, height, isCompact, contentMaxWidth } = useResponsiveLayout();
  const shouldWrapRatings = width < 430;
  const cardMinHeight = Math.min(400, Math.max(260, Math.floor(height * 0.42)));
  const cardPadding = isCompact ? 24 : 32;
  const ratingMinHeight = shouldWrapRatings ? 64 : 80;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<ReviewedFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cards, setCards] = useState<(CardRes & { subjectId?: string })[]>([]);
  const [totalCards, setTotalCards] = useState<number>(0);
  // Animation values
  const flipRotation = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const hintOpacity = useSharedValue(1);

  const fetchCards = () => {
    setIsLoading(true);
    setLoadError(null);
    if (isTestSuiteMode && _shelfId && _testSuiteId) {
      runTestPreset(_shelfId, _testSuiteId)
        .then((response) => {
          if (response.isSuccess && Array.isArray(response.data)) {
            const list = response.data as TestRunCardRes[];
            setCards(list);
            setTotalCards(list.length);
          } else {
            console.error("Failed to run test preset:", response.message);
            setLoadError(response.message ?? "Failed to load test cards");
          }
        })
        .catch((error) => {
          console.error("Error running test preset:", error);
          setLoadError(error?.message ?? "Could not connect to server");
        })
        .finally(() => setIsLoading(false));
      return;
    }
    if (_shelfId && _subjectId) {
      fetchCardsDataBySubjectAndShelf(_shelfId, _subjectId)
        .then((response) => {
          if (response.isSuccess) {
            setCards(response.data.entities);
            setTotalCards(response.data.totalItems);
          } else {
            console.error("Failed to fetch cards:", response.message);
            setLoadError(response.message ?? "Failed to load cards");
          }
        })
        .catch((error) => {
          console.error("Error fetching cards:", error);
          setLoadError(error?.message ?? "Could not connect to server");
        })
        .finally(() => setIsLoading(false));
      return;
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCards();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_shelfId, _subjectId, _testSuiteId, isTestSuiteMode]);

  // Animated styles for card flip
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipRotation.value,
      [0, 1],
      [0, 180],
      Extrapolate.CLAMP,
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale: cardScale.value },
      ],
      backfaceVisibility: "hidden",
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipRotation.value,
      [0, 1],
      [180, 360],
      Extrapolate.CLAMP,
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale: cardScale.value },
      ],
      backfaceVisibility: "hidden",
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  // Handle card flip
  const handleCardPress = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      hintOpacity.value = withTiming(0, { duration: 150 });
      flipRotation.value = withTiming(1, {
        duration: 350,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });
      cardScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
      buttonOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      buttonTranslateY.value = withDelay(200, withTiming(0, { duration: 300 }));
    }
  };

  // Handle rating selection
  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    if (!cards.length || !cards[currentIndex]) return;

    cardScale.value = withTiming(0.9, { duration: 150 });
    buttonOpacity.value = withTiming(0, { duration: 150 });

    const entry: ReviewedFlashcard = {
      cardId: cards[currentIndex].id,
      newLevel: rating.toUpperCase() as "HARD" | "GOOD" | "EASY" | "AGAIN",
    };
    const nextReviewed = [...reviewedCards, entry];
    setReviewedCards(nextReviewed);

    setTimeout(() => {
      if (rating === "again") {
        setCurrentIndex(currentIndex);
        setIsFlipped(false);
        flipRotation.value = 0;
        cardScale.value = 1;
        buttonOpacity.value = 0;
        buttonTranslateY.value = 20;
        hintOpacity.value = 1;
        return;
      }
      if (currentIndex < totalCards - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        flipRotation.value = 0;
        cardScale.value = 1;
        buttonOpacity.value = 0;
        buttonTranslateY.value = 20;
        hintOpacity.value = 1;
        return;
      }

      if (isTestSuiteMode && _shelfId) {
        const bySubject = new Map<string, ReviewedFlashcard[]>();
        for (const r of nextReviewed) {
          const sid = cards.find((c) => c.id === r.cardId)?.subjectId;
          if (!sid) continue;
          const arr = bySubject.get(sid) ?? [];
          arr.push(r);
          bySubject.set(sid, arr);
        }
        Promise.all(
          Array.from(bySubject.entries()).map(([subjectId, batch]) =>
            updateDifficultyLevels(_shelfId, subjectId, batch),
          ),
        )
          .then(() => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            router.replace(`/home?testComplete=1&duration=${duration}`);
          })
          .catch((error) => {
            console.error("Error updating difficulty after test:", error);
            router.replace("/home");
          });
        return;
      }

      updateDifficultyLevels(_shelfId!, _subjectId!, nextReviewed)
        .then((response) => {
          if (response.isSuccess) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            router.push(
              `/${_shelfId}/complete/${_subjectId}?duration=${duration}`,
            );
          } else {
            console.error(
              "Failed to update difficulty levels:",
              response.message,
            );
          }
        })
        .catch((error) => {
          console.error("Error updating difficulty levels:", error);
        });
    }, 200);
  };

  // Handle reset/undo
  const handleReset = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      flipRotation.value = 0;
      cardScale.value = 1;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;
      setReviewedCards(reviewedCards.slice(0, -1));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={uiTokens.review.gradientStart} />

      {/* Gradient Background */}
      <LinearGradient
        colors={[
          uiTokens.review.gradientStart,
          uiTokens.review.gradientMid,
          uiTokens.review.gradientEnd,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Progress Bar */}
        <View style={[styles.progressContainer, { maxWidth: contentMaxWidth }]}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (Math.min(currentIndex + 1, Math.max(totalCards, 1)) /
                      Math.max(totalCards, 1)) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            <Sparkles size={16} color={uiTokens.text.onAccent} strokeWidth={2} />
            <Text style={styles.progressText}>
              {totalCards > 0 ? `${currentIndex + 1} of ${totalCards}` : "No cards"}
            </Text>
          </View>
          <Text style={styles.sessionModeHint} testID="session-mode-label">
            {isTestSuiteMode ? "Test from preset · ratings save to SRS" : "Study · SRS session"}
          </Text>
        </View>

        {/* Header */}
        <View style={[styles.header, { maxWidth: contentMaxWidth }]}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.back()}
            hitSlop={8}
            testID="review-close-button"
          >
            <View style={styles.iconButtonInner}>
              <X size={22} color={uiTokens.text.onAccent} strokeWidth={2.5} />
            </View>
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={handleReset}
            disabled={currentIndex === 0}
            hitSlop={8}
            testID="review-reset-button"
          >
            <View
              style={[
                styles.iconButtonInner,
                currentIndex === 0 && styles.iconButtonDisabled,
              ]}
            >
              <RotateCcw
                size={20}
                color={currentIndex === 0 ? uiTokens.accent.disabled : uiTokens.text.onAccent}
                strokeWidth={2.5}
              />
            </View>
          </Pressable>
        </View>

        {/* Card Container */}
        <View style={[styles.cardContainer, { maxWidth: contentMaxWidth }]}>
          {isLoading ? (
            <View style={styles.emptyState} testID="cards-loading-state">
              <Text style={styles.emptyTitle}>Loading cards...</Text>
              <Text style={styles.emptySubtitle}>Preparing your session.</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyState} testID="review-error-state">
              <Text style={styles.emptyTitle}>Could not load</Text>
              <Text style={styles.emptySubtitle}>{loadError}</Text>
              <Pressable
                style={styles.emptyBackBtn}
                onPress={() => router.back()}
                testID="review-error-back-button"
              >
                <Text style={styles.emptyBackBtnText}>Go back</Text>
              </Pressable>
            </View>
          ) : totalCards === 0 ? (
            <View style={styles.emptyState} testID="empty-cards-state">
              <Text style={styles.emptyTitle}>Nothing to review</Text>
              <Text style={styles.emptySubtitle}>
                Try a different preset or add cards to your subject first.
              </Text>
              <Pressable
                style={styles.emptyBackBtn}
                onPress={() => router.back()}
                testID="empty-go-back-button"
              >
                <Text style={styles.emptyBackBtnText}>Go back</Text>
              </Pressable>
            </View>
          ) : !isFlipped ? (
            // Front of card (Question)
            <Animated.View
              style={[styles.card, { minHeight: cardMinHeight }, frontAnimatedStyle]}
            >
              <Pressable style={styles.cardPressable} onPress={handleCardPress}>
                <View style={[styles.cardContent, { padding: cardPadding }]}>
                  <View style={styles.questionBadge}>
                    <Text style={styles.questionBadgeText}>Question</Text>
                  </View>
                  <Text style={styles.questionText}>
                    {cards[currentIndex]?.front}
                  </Text>
                  <Animated.View style={[styles.tapHintContainer, hintAnimatedStyle]}>
                    <View style={styles.tapHintDot} />
                    <Text style={styles.tapHint}>Tap to reveal answer</Text>
                    <View style={styles.tapHintDot} />
                  </Animated.View>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            // Back of card (Answer)
            <Animated.View
              style={[styles.card, { minHeight: cardMinHeight }, backAnimatedStyle]}
            >
              <View style={[styles.cardContent, { padding: cardPadding }]}>
                <View style={styles.questionBadge}>
                  <Text style={styles.questionBadgeText}>Question</Text>
                </View>
                <Text style={styles.questionTextSmall}>
                  {cards[currentIndex]?.front}
                </Text>

                <View style={styles.divider} />

                <View style={styles.answerBadge}>
                  <Text style={styles.answerBadgeText}>Answer</Text>
                </View>
                <Text style={styles.answerText}>
                  {cards[currentIndex]?.back}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Footer Controls */}
        <View style={[styles.footer, { maxWidth: contentMaxWidth }]}>
          {totalCards === 0 ? null : !isFlipped ? (
            <View style={styles.footerHintContainer}>
              <View style={styles.footerHintDot} />
              <Text style={styles.footerHint}>
                Tap the card above to continue
              </Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.buttonRow,
                shouldWrapRatings && styles.buttonRowWrapped,
                buttonAnimatedStyle,
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  shouldWrapRatings && styles.ratingButtonWrapped,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("again")}
                testID="rating-again-button"
              >
                <View
                  style={[
                    styles.ratingButtonSolid,
                    { backgroundColor: uiTokens.review.rating.again, minHeight: ratingMinHeight },
                  ]}
                >
                  <Text style={styles.buttonLabel}>Again</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  shouldWrapRatings && styles.ratingButtonWrapped,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("hard")}
                testID="rating-hard-button"
              >
                <View
                  style={[
                    styles.ratingButtonSolid,
                    { backgroundColor: uiTokens.review.rating.hard, minHeight: ratingMinHeight },
                  ]}
                >
                  <Text style={styles.buttonLabel}>Hard</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  shouldWrapRatings && styles.ratingButtonWrapped,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("good")}
                testID="rating-good-button"
              >
                <View
                  style={[
                    styles.ratingButtonSolid,
                    { backgroundColor: uiTokens.review.rating.good, minHeight: ratingMinHeight },
                  ]}
                >
                  <Text style={styles.buttonLabel}>Good</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  shouldWrapRatings && styles.ratingButtonWrapped,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("easy")}
                testID="rating-easy-button"
              >
                <View
                  style={[
                    styles.ratingButtonSolid,
                    { backgroundColor: uiTokens.review.rating.easy, minHeight: ratingMinHeight },
                  ]}
                >
                  <Text style={styles.buttonLabel}>Easy</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
  },
  progressContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 3,
  },
  progressTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 6,
  },
  progressText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
  },
  sessionModeHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyBackBtn: {
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyBackBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 4,
  },
  iconButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  cardContainer: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressable: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
  },
  questionBadge: {
    alignSelf: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  questionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E1B4B",
    textAlign: "center",
    lineHeight: 38,
  },
  questionTextSmall: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E1B4B",
    textAlign: "center",
    lineHeight: 28,
  },
  tapHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    gap: 8,
  },
  tapHintDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C7D2FE",
  },
  tapHint: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  divider: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginVertical: 24,
    borderRadius: 1,
  },
  answerBadge: {
    alignSelf: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  answerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  answerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E1B4B",
    textAlign: "center",
    lineHeight: 32,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  footerHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  footerHintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  footerHint: {
    fontSize: 15,
    color: "#FFF",
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  buttonRowWrapped: {
    flexWrap: "wrap",
  },
  ratingButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingButtonWrapped: {
    flexBasis: "48%",
  },
  ratingButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  ratingButtonSolid: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonInterval: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    opacity: 0.95,
  },
});

export default FlashcardReviewScreen;
