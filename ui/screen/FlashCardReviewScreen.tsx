import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { X, RotateCcw, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import {
  fetchCardsDataBySubjectAndShelf,
  updateDifficultyLevels,
} from "@/services/CardService";
import { getCardsForTestSuite } from "@/services/TestSuiteService";
import { CardRes, ReviewedFlashcard } from "@/types/Card";

type FlashcardReviewProps =
  | { _shelfId: string; _subjectId: string; _testSuiteId?: never }
  | { _shelfId?: never; _subjectId?: never; _testSuiteId: string };

const FlashcardReviewScreen = (props: FlashcardReviewProps) => {
  const { _shelfId, _subjectId, _testSuiteId } = props;
  const isTestSuiteMode = Boolean(_testSuiteId);
  const startTime = Date.now();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<ReviewedFlashcard[]>([]);

  const [cards, setCards] = useState<CardRes[]>([]);
  const [totalCards, setTotalCards] = useState<number>(0);
  // Animation values
  const flipRotation = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  const fetchCards = () => {
    if (_testSuiteId) {
      getCardsForTestSuite(_testSuiteId)
        .then((response) => {
          if (response.isSuccess && Array.isArray(response.data)) {
            setCards(response.data);
            setTotalCards(response.data.length);
          } else {
            console.error("Failed to fetch cards for test suite:", response.message);
          }
        })
        .catch((error) => {
          console.error("Error fetching cards for test suite:", error);
        });
      return;
    }
    if (_shelfId && _subjectId) {
      fetchCardsDataBySubjectAndShelf(_shelfId, _subjectId)
        .then((response) => {
          if (response.isSuccess) {
            console.log("Fetched cards:", response.data);
            setCards(response.data.entities);
            setTotalCards(response.data.totalItems);
          } else {
            console.error("Failed to fetch cards:", response.message);
          }
        })
        .catch((error) => {
          console.error("Error fetching cards:", error);
        });
    }
  };

  useEffect(() => {
    fetchCards();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_shelfId, _subjectId, _testSuiteId]);

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

  // Handle card flip
  const handleCardPress = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      flipRotation.value = withSpring(1, { damping: 15, stiffness: 100 });
      cardScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
      buttonOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      buttonTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
    }
  };

  // Handle rating selection
  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    // Animate card out
    cardScale.value = withTiming(0.9, { duration: 150 });
    buttonOpacity.value = withTiming(0, { duration: 150 });

    // Mark card as reviewed
    setReviewedCards([
      ...reviewedCards,
      {
        cardId: cards[currentIndex].id,
        newLevel: rating.toUpperCase() as "HARD" | "GOOD" | "EASY" | "AGAIN",
      },
    ]);

    // Move to next card or finish
    setTimeout(() => {
      if (rating === "again") {
        setCurrentIndex(currentIndex);
        setIsFlipped(false);
        flipRotation.value = 0;
        cardScale.value = 1;
        buttonOpacity.value = 0;
        buttonTranslateY.value = 20;
      } else {
        if (currentIndex < totalCards - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsFlipped(false);
          flipRotation.value = 0;
          cardScale.value = 1;
          buttonOpacity.value = 0;
          buttonTranslateY.value = 20;
        } else {
          if (isTestSuiteMode) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            router.replace(`/home?testComplete=1&duration=${duration}`);
            return;
          }
          updateDifficultyLevels(_shelfId!, _subjectId!, reviewedCards)
            .then((response) => {
              if (response.isSuccess) {
                // Session complete - navigate to results
                const endTime = Date.now();
                const duration = endTime - startTime;
                router.push(
                  `/${_shelfId}/complete/${_subjectId}?duration=${duration}`,
                );
                console.log("Updated difficulty levels successfully");
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
        }
      }
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
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Gradient Background */}
      <LinearGradient
        colors={["#6366F1", "#8B5CF6", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / totalCards) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            <Sparkles size={16} color="#FFF" strokeWidth={2} />
            <Text style={styles.progressText}>
              {currentIndex + 1} of {totalCards}
            </Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <View style={styles.iconButtonInner}>
              <X size={22} color="#FFF" strokeWidth={2.5} />
            </View>
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={handleReset}
            disabled={currentIndex === 0}
            hitSlop={8}
          >
            <View
              style={[
                styles.iconButtonInner,
                currentIndex === 0 && styles.iconButtonDisabled,
              ]}
            >
              <RotateCcw
                size={20}
                color={currentIndex === 0 ? "#A5B4FC" : "#FFF"}
                strokeWidth={2.5}
              />
            </View>
          </Pressable>
        </View>

        {/* Card Container */}
        <View style={styles.cardContainer}>
          {!isFlipped ? (
            // Front of card (Question)
            <Animated.View style={[styles.card, frontAnimatedStyle]}>
              <Pressable style={styles.cardPressable} onPress={handleCardPress}>
                <View style={styles.cardContent}>
                  <View style={styles.questionBadge}>
                    <Text style={styles.questionBadgeText}>Question</Text>
                  </View>
                  <Text style={styles.questionText}>
                    {cards[currentIndex]?.front}
                  </Text>
                  <View style={styles.tapHintContainer}>
                    <View style={styles.tapHintDot} />
                    <Text style={styles.tapHint}>Tap to reveal answer</Text>
                    <View style={styles.tapHintDot} />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            // Back of card (Answer)
            <Animated.View style={[styles.card, backAnimatedStyle]}>
              <View style={styles.cardContent}>
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
        <View style={styles.footer}>
          {!isFlipped ? (
            <View style={styles.footerHintContainer}>
              <View style={styles.footerHintDot} />
              <Text style={styles.footerHint}>
                Tap the card above to continue
              </Text>
            </View>
          ) : (
            <Animated.View style={[styles.buttonRow, buttonAnimatedStyle]}>
              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("again")}
              >
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  style={styles.ratingButtonGradient}
                >
                  <Text style={styles.buttonLabel}>Again</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("hard")}
              >
                <LinearGradient
                  colors={["#F97316", "#EA580C"]}
                  style={styles.ratingButtonGradient}
                >
                  <Text style={styles.buttonLabel}>Hard</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("good")}
              >
                <LinearGradient
                  colors={["#3B82F6", "#2563EB"]}
                  style={styles.ratingButtonGradient}
                >
                  <Text style={styles.buttonLabel}>Good</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingButton,
                  pressed && styles.ratingButtonPressed,
                ]}
                onPress={() => handleRating("easy")}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.ratingButtonGradient}
                >
                  <Text style={styles.buttonLabel}>Easy</Text>
                </LinearGradient>
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
  },
  progressContainer: {
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
  header: {
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
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    minHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
    color: "#111827",
    textAlign: "center",
    lineHeight: 38,
  },
  questionTextSmall: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
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
    color: "#3B82F6",
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
  ratingButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  ratingButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
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
