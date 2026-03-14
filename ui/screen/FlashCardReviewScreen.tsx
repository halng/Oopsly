import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, Dimensions } from "react-native";
import { X, RotateCcw, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  runOnJS,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  // Gesture translation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

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

  // Flip styles
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

  // Pan Gesture styles
  const wrapperStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2],
      [-15, 15],
      Extrapolate.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Swipe Action
  const finishSwipeSession = (currentReviewedCards: ReviewedFlashcard[]) => {
    if (isTestSuiteMode) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      router.replace(`/home?testComplete=1&duration=${duration}`);
      return;
    }
    updateDifficultyLevels(_shelfId!, _subjectId!, currentReviewedCards)
      .then((response) => {
        if (response.isSuccess) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          router.push(`/${_shelfId}/complete/${_subjectId}?duration=${duration}` as any);
        }
      })
      .catch((error) => {
        console.error("Error updating difficulty levels:", error);
      });
  };

  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    const newReviewedCards = [
      ...reviewedCards,
      {
        cardId: cards[currentIndex].id,
        newLevel: rating.toUpperCase() as "HARD" | "GOOD" | "EASY" | "AGAIN",
      },
    ];
    setReviewedCards(newReviewedCards);

    setTimeout(() => {
      setIsFlipped(false);
      flipRotation.value = 0;
      cardScale.value = 1;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;
      translateX.value = 0;
      translateY.value = 0;

      if (rating === "again") {
        // Just review again right away
        setCurrentIndex(currentIndex);
      } else {
        if (currentIndex < totalCards - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          finishSwipeSession(newReviewedCards);
        }
      }
    }, 200);
  };

  const onButtonRating = (rating: "again" | "hard" | "good" | "easy") => {
    let toX = 0;
    let toY = 0;
    if (rating === "easy") { toX = 500; toY = -500; }
    else if (rating === "good") { toX = -500; toY = -500; }
    else if (rating === "hard") { toX = 500; toY = 500; }
    else if (rating === "again") { toX = -500; toY = 500; }

    translateX.value = withTiming(toX, { duration: 300 });
    translateY.value = withTiming(toY, { duration: 300 });
    cardScale.value = withTiming(0.9, { duration: 150 });
    buttonOpacity.value = withTiming(0, { duration: 150 });

    handleRating(rating);
  };

  const panGesture = Gesture.Pan()
    .enabled(isFlipped)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

      if (
        Math.abs(e.translationX) > SWIPE_THRESHOLD ||
        Math.abs(e.translationY) > SWIPE_THRESHOLD
      ) {
        const isRight = e.translationX > 0;
        const isTop = e.translationY < 0;

        let rating: "easy" | "good" | "hard" | "again";
        if (isRight && isTop) rating = "easy";
        else if (!isRight && isTop) rating = "good";
        else if (isRight && !isTop) rating = "hard";
        else rating = "again";

        translateX.value = withTiming(isRight ? 500 : -500, { duration: 300 });
        translateY.value = withTiming(isTop ? -500 : 500, { duration: 300 });
        cardScale.value = withTiming(0.9, { duration: 150 });
        buttonOpacity.value = withTiming(0, { duration: 150 });

        runOnJS(handleRating)(rating);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

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

  const handleReset = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      flipRotation.value = 0;
      cardScale.value = 1;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;
      translateX.value = 0;
      translateY.value = 0;
      setReviewedCards(reviewedCards.slice(0, -1));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <LinearGradient
        colors={["#6366F1", "#8B5CF6", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: totalCards > 0 ? `${((currentIndex + 1) / totalCards) * 100}%` : '0%' },
              ]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            <Sparkles size={16} color="#FFF" strokeWidth={2} />
            <Text style={styles.progressText}>
              {totalCards > 0 ? `${currentIndex + 1} of ${totalCards}` : `0 of 0`}
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()} hitSlop={8}>
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
            <View style={[styles.iconButtonInner, currentIndex === 0 && styles.iconButtonDisabled]}>
              <RotateCcw size={20} color={currentIndex === 0 ? "#A5B4FC" : "#FFF"} strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>

        <View style={styles.cardContainer}>
          {totalCards > 0 && cards[currentIndex] && (
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.cardWrapper, wrapperStyle]}>
                {!isFlipped ? (
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
              </Animated.View>
            </GestureDetector>
          )}
        </View>

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
              <Pressable style={({ pressed }) => [styles.ratingButton, pressed && styles.ratingButtonPressed]} onPress={() => onButtonRating("again")}>
                <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.ratingButtonGradient}>
                  <Text style={styles.buttonLabel}>Again</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.ratingButton, pressed && styles.ratingButtonPressed]} onPress={() => onButtonRating("hard")}>
                <LinearGradient colors={["#F97316", "#EA580C"]} style={styles.ratingButtonGradient}>
                  <Text style={styles.buttonLabel}>Hard</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.ratingButton, pressed && styles.ratingButtonPressed]} onPress={() => onButtonRating("good")}>
                <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.ratingButtonGradient}>
                  <Text style={styles.buttonLabel}>Good</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.ratingButton, pressed && styles.ratingButtonPressed]} onPress={() => onButtonRating("easy")}>
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.ratingButtonGradient}>
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
  container: { flex: 1 },
  safeArea: { flex: 1 },
  progressContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  progressBar: { height: 6, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FFF", borderRadius: 3 },
  progressTextContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8, gap: 6 },
  progressText: { fontSize: 14, color: "#FFF", fontWeight: "600" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8 },
  iconButton: { padding: 4 },
  iconButtonInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)", alignItems: "center", justifyContent: "center" },
  iconButtonDisabled: { opacity: 0.4 },
  cardContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 20 },
  cardWrapper: { flex: 1, justifyContent: "center" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, minHeight: 400, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  cardPressable: { flex: 1 },
  cardContent: { flex: 1, padding: 32, justifyContent: "center" },
  questionBadge: { alignSelf: "center", backgroundColor: "#EEF2FF", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
  questionBadgeText: { fontSize: 12, fontWeight: "700", color: "#6366F1", textTransform: "uppercase", letterSpacing: 1 },
  questionText: { fontSize: 28, fontWeight: "700", color: "#111827", textAlign: "center", lineHeight: 38 },
  questionTextSmall: { fontSize: 20, fontWeight: "600", color: "#374151", textAlign: "center", lineHeight: 28 },
  tapHintContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 32, gap: 8 },
  tapHintDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C7D2FE" },
  tapHint: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  divider: { height: 2, backgroundColor: "#E5E7EB", marginVertical: 24, borderRadius: 1 },
  answerBadge: { alignSelf: "center", backgroundColor: "#DBEAFE", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  answerBadgeText: { fontSize: 12, fontWeight: "700", color: "#3B82F6", textTransform: "uppercase", letterSpacing: 1 },
  answerText: { fontSize: 24, fontWeight: "700", color: "#3B82F6", textAlign: "center", lineHeight: 32 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  footerHintContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 8 },
  footerHintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255, 255, 255, 0.6)" },
  footerHint: { fontSize: 15, color: "#FFF", fontWeight: "500" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  ratingButton: { flex: 1, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  ratingButtonPressed: { transform: [{ scale: 0.95 }] },
  ratingButtonGradient: { paddingVertical: 18, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", minHeight: 80 },
  buttonLabel: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  buttonInterval: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", opacity: 0.95 },
});

export default FlashcardReviewScreen;
