import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";

import { guessVoiceNoteMimeType } from "@/lib/task-voice-notes";

type CompletedRecording = {
  localUri: string;
  durationMs: number;
  mimeType: string;
};

const MIN_RECORDING_MS = 500;
const TICK_INTERVAL_MS = 250;

function showMicrophoneDeniedAlert() {
  Alert.alert(
    "Microphone access",
    "Allow microphone access in Settings to record voice notes.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ],
  );
}

export function useVoiceNoteRecorderExpo() {
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: "document",
  });

  // Own state instead of `useAudioRecorderState`: that hook polls every 500ms,
  // so a quick second tap would still see the old value and never stop.
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const isRecordingRef = useRef(false);
  const busyRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const setRecording = useCallback((value: boolean) => {
    isRecordingRef.current = value;
    setIsRecording(value);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setDurationMs(0);
      return;
    }

    const interval = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt != null) {
        setDurationMs(Date.now() - startedAt);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Never leave the microphone open if the screen goes away mid-recording.
  useEffect(() => {
    return () => {
      if (!isRecordingRef.current) return;
      isRecordingRef.current = false;
      void audioRecorder
        .stop()
        .catch(() => undefined)
        .finally(() => {
          void setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: false,
          }).catch(() => undefined);
        });
    };
  }, [audioRecorder]);

  const startRecording = useCallback(async () => {
    if (busyRef.current || isRecordingRef.current) {
      return false;
    }

    busyRef.current = true;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showMicrophoneDeniedAlert();
        return false;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      startedAtRef.current = Date.now();
      setRecording(true);
      return true;
    } catch {
      setRecording(false);
      startedAtRef.current = null;
      Alert.alert(
        "Voice note",
        "Couldn't start recording. Check microphone access and try again.",
      );
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [audioRecorder, setRecording]);

  const stopRecording =
    useCallback(async (): Promise<CompletedRecording | null> => {
      if (busyRef.current || !isRecordingRef.current) {
        return null;
      }

      busyRef.current = true;
      const startedAt = startedAtRef.current ?? Date.now();
      setRecording(false);
      startedAtRef.current = null;

      try {
        await audioRecorder.stop();
        // Switch back to playback routing so voice notes play through the speaker.
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        }).catch(() => undefined);

        const localUri = audioRecorder.uri;
        if (!localUri) {
          return null;
        }

        return {
          localUri,
          durationMs: Math.max(MIN_RECORDING_MS, Date.now() - startedAt),
          mimeType: guessVoiceNoteMimeType(localUri),
        };
      } catch {
        Alert.alert("Voice note", "Couldn't finish the recording.");
        return null;
      } finally {
        busyRef.current = false;
      }
    }, [audioRecorder, setRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return stopRecording();
    }
    await startRecording();
    return null;
  }, [startRecording, stopRecording]);

  return {
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
