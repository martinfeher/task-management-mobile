import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";

import { guessVoiceNoteMimeType } from "@/lib/task-voice-notes";

type CompletedRecording = {
  localUri: string;
  durationMs: number;
  mimeType: string;
};

export function useVoiceNoteRecorderExpo() {
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: "document",
  });
  const recorderState = useAudioRecorderState(audioRecorder);
  const startedAtRef = useRef<number | null>(null);
  const permissionsReadyRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      permissionsReadyRef.current = status.granted;
      if (!status.granted) {
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const startRecording = useCallback(async () => {
    if (!permissionsReadyRef.current) {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      permissionsReadyRef.current = status.granted;
      if (!status.granted) {
        Alert.alert(
          "Microphone access",
          "Allow microphone access to record voice notes.",
        );
        return false;
      }
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    startedAtRef.current = Date.now();
    return true;
  }, [audioRecorder]);

  const stopRecording = useCallback(async (): Promise<CompletedRecording | null> => {
    if (!recorderState.isRecording) {
      return null;
    }

    const startedAt = startedAtRef.current ?? Date.now();
    await audioRecorder.stop();
    startedAtRef.current = null;

    const localUri = audioRecorder.uri;
    if (!localUri) {
      return null;
    }

    return {
      localUri,
      durationMs: Math.max(500, Date.now() - startedAt),
      mimeType: guessVoiceNoteMimeType(localUri),
    };
  }, [audioRecorder, recorderState.isRecording]);

  const toggleRecording = useCallback(async () => {
    if (recorderState.isRecording) {
      return stopRecording();
    }
    const started = await startRecording();
    return started ? null : null;
  }, [recorderState.isRecording, startRecording, stopRecording]);

  return {
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
