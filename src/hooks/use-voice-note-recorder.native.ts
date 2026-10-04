import { requireOptionalNativeModule } from "expo-modules-core";

import { useVoiceNoteRecorderStub } from "@/hooks/use-voice-note-recorder-stub";

const hasExpoAudioNative = requireOptionalNativeModule("ExpoAudio") != null;

const useVoiceNoteRecorderImpl = hasExpoAudioNative
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/hooks/use-voice-note-recorder.expo").useVoiceNoteRecorderExpo
  : useVoiceNoteRecorderStub;

export function useVoiceNoteRecorder() {
  return useVoiceNoteRecorderImpl();
}
