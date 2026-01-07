import { Audio } from "expo-av";
import { Alert } from "react-native";

export interface AudioRecordingService {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string | null>;
  requestPermissions(): Promise<boolean>;
  cleanup(): Promise<void>;
}

class AudioRecorderImpl implements AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.status === "granted";
    } catch (error) {
      Alert.alert("Permission error", "Unable to request microphone access");
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DuckOthers,
      });

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await this.recording.startAsync();
    } catch (error) {
      Alert.alert(
        "Recording error",
        error instanceof Error ? error.message : "Failed to start recording"
      );
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (error) {
      Alert.alert(
        "Stop recording error",
        error instanceof Error ? error.message : "Failed to stop recording"
      );
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

export const audioRecordingService = new AudioRecorderImpl();
