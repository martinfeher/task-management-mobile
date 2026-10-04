import { useCallback, useState } from "react";
import { Alert } from "react-native";

type CompletedRecording = {
  localUri: string;
  durationMs: number;
  mimeType: string;
};

type StubReason = "web" | "native-module";

function showUnavailableAlert(reason: StubReason) {
  if (reason === "web") {
    Alert.alert(
      "Voice note",
      "Voice recording is available in the iOS and Android app.",
    );
    return;
  }

  Alert.alert(
    "Voice note unavailable",
    "Install a development build that includes expo-audio (run npx expo run:ios or npx expo run:android), then reopen the app.",
  );
}

export function useVoiceNoteRecorderStub(reason: StubReason = "native-module") {
  const [isRecording] = useState(false);

  const startRecording = useCallback(async () => {
    showUnavailableAlert(reason);
    return false;
  }, [reason]);

  const stopRecording = useCallback(async (): Promise<CompletedRecording | null> => {
    return null;
  }, []);

  const toggleRecording = useCallback(async () => {
    showUnavailableAlert(reason);
    return null;
  }, [reason]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

export function useVoiceNoteRecorderWeb() {
  return useVoiceNoteRecorderStub("web");
}
