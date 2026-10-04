import { requireOptionalNativeModule } from "expo-modules-core";
import { Alert } from "react-native";

const hasExpoAudioNative = requireOptionalNativeModule("ExpoAudio") != null;

export async function playVoiceNoteUri(uri: string) {
  if (!uri) return;

  if (!hasExpoAudioNative) {
    Alert.alert(
      "Voice note",
      "Install a development build that includes expo-audio to play recordings.",
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { playVoiceNoteUriExpo } = require("@/lib/play-voice-note.expo");
  await playVoiceNoteUriExpo(uri);
}
