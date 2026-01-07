import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Mic, MicOff, X } from "lucide-react-native";
import { useTutorSessionStore } from "@/store/TutorSessionStore";
import { audioRecordingService } from "@/services/AudioRecordingService";
import { sendAudioTurn, TutorTurnResult } from "@/services/TutorService";
import { useAuthStore } from "@/store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TutorSessionScreen() {
  const router = useRouter();
  const session = useTutorSessionStore();
  const token = useAuthStore((state) => state.token ?? "");

  const [isLoading, setIsLoading] = useState(false);
  const [isTalkingOrListening, setIsTalkingOrListening] = useState(false);
  const [tutorReply, setTutorReply] = useState<string>("");
  const [currentCardQuestion, setCurrentCardQuestion] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");

  useEffect(() => {
    if (!session.isActive || !session.deckId) {
      router.back();
    }
  }, [session.isActive, session.deckId]);

  useEffect(() => {
    return () => {
      audioRecordingService.cleanup();
    };
  }, []);

  const handleMicToggle = async () => {
    if (isTalkingOrListening) {
      await stopTalkingAndListen();
    } else {
      await startTalking();
    }
  };

  const startTalking = async () => {
    const hasPermission = await audioRecordingService.requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permission denied",
        "Microphone access is required for audio drilling."
      );
      return;
    }

    setIsTalkingOrListening(true);
    setTranscription("");

    try {
      await audioRecordingService.startRecording();
      session.setRecording(true);
    } catch (error) {
      Alert.alert(
        "Recording failed",
        error instanceof Error ? error.message : "Unable to start recording"
      );
      setIsTalkingOrListening(false);
    }
  };

  const stopTalkingAndListen = async () => {
    if (!session.deckId) {
      return;
    }

    setIsTalkingOrListening(false);
    session.setRecording(false);

    try {
      const audioUri = await audioRecordingService.stopRecording();
      setIsLoading(true);

      const result = await sendAudioTurn(
        session.deckId,
        audioUri,
        transcription || "Continue with the next question.",
        session.sessionId ?? undefined,
        token
      );

      session.setSessionId(result.sessionId);
      session.setLastCardId(result.cardId);
      setCurrentCardQuestion(result.cardQuestion);
      setTutorReply(result.tutorReply);

      // Optionally trigger audio playback of tutorReplyAudioBase64
      // For now, just show the text response
    } catch (error) {
      Alert.alert(
        "Tutor error",
        error instanceof Error ? error.message : "Failed to communicate with tutor"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      "End session?",
      "Are you sure you want to exit the audio drill?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Exit",
          onPress: () => {
            audioRecordingService.cleanup();
            session.endSession();
            router.back();
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-900">
      {/* Header */}
      <View className="px-4 py-2 flex-row items-center justify-between border-b border-indigo-800">
        <TouchableOpacity onPress={handleEndSession}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-semibold text-lg">Audio Drill</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-between px-4 py-8">
        {/* Current Question */}
        <View className="items-center justify-start flex-1">
          <Text className="text-white text-xs uppercase tracking-wider mb-2 opacity-70">
            Current Question
          </Text>
          <Text className="text-white text-2xl font-bold text-center leading-8">
            {currentCardQuestion || "Preparing first question..."}
          </Text>
        </View>

        {/* Tutor Reply */}
        {tutorReply && (
          <View className="bg-indigo-800 rounded-2xl p-6 mb-8">
            <Text className="text-white text-sm font-semibold mb-2 uppercase opacity-70">
              Tutor says:
            </Text>
            <Text className="text-white text-lg leading-6">{tutorReply}</Text>
          </View>
        )}

        {/* Transcription Display (while recording) */}
        {session.isRecording && (
          <View className="bg-indigo-700 rounded-xl p-4 mb-6">
            <Text className="text-indigo-200 text-xs uppercase font-semibold mb-2">
              Listening...
            </Text>
            {transcription && (
              <Text className="text-white text-base">{transcription}</Text>
            )}
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View className="items-center mb-6">
            <ActivityIndicator size="large" color="#fff" />
            <Text className="text-white text-sm mt-3 opacity-70">
              Tutor is thinking...
            </Text>
          </View>
        )}

        {/* Push-to-Talk Button */}
        <View className="items-center">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleMicToggle}
            disabled={isLoading}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: isTalkingOrListening ? "#ef4444" : "#10b981",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: isTalkingOrListening ? "#ef4444" : "#10b981",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 12,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : isTalkingOrListening ? (
              <Mic size={44} color="#fff" strokeWidth={1.5} />
            ) : (
              <MicOff size={44} color="#fff" strokeWidth={1.5} />
            )}
          </TouchableOpacity>

          <Text className="text-white text-center mt-4 text-sm">
            {isLoading
              ? "Processing..."
              : isTalkingOrListening
                ? "Tap to finish speaking"
                : "Tap to speak"}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </SafeAreaView>
  );
}
