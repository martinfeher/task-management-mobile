import { Alert } from "react-native";

export async function playVoiceNoteUri(_uri: string) {
  Alert.alert(
    "Voice note",
    "Voice playback is available in the iOS and Android app.",
  );
}
