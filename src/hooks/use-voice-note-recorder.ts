import { useVoiceNoteRecorderStub } from "@/hooks/use-voice-note-recorder-stub";

/** Default export for TypeScript; Metro uses `.native.ts` / `.web.ts` on device. */
export function useVoiceNoteRecorder() {
  return useVoiceNoteRecorderStub();
}
