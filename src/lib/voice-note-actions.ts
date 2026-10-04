import { Alert } from "react-native";

import { playVoiceNoteUri } from "@/lib/play-voice-note";
import { formatVoiceNoteDuration } from "@/lib/task-voice-notes";

type VoiceNoteAttachmentActionsOptions = {
  durationMs: number;
  playbackUri: string;
  onRemove: () => void;
};

export function showVoiceNoteAttachmentActions({
  durationMs,
  playbackUri,
  onRemove,
}: VoiceNoteAttachmentActionsOptions) {
  Alert.alert("Voice note", formatVoiceNoteDuration(durationMs), [
    {
      text: "Play",
      onPress: () => {
        void playVoiceNoteUri(playbackUri);
      },
    },
    {
      text: "Remove",
      style: "destructive",
      onPress: onRemove,
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
