import { AudioModule, setAudioModeAsync } from "expo-audio";

import { getStoredAuthToken } from "@/lib/auth-session";

type AudioPlayerInstance = InstanceType<typeof AudioModule.AudioPlayer>;

let activePlayer: AudioPlayerInstance | null = null;

function stopActivePlayer() {
  if (!activePlayer) return;
  try {
    activePlayer.pause();
  } catch {
    // ignore pause errors
  }
  activePlayer = null;
}

function isRemoteUri(uri: string) {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

export async function playVoiceNoteUriExpo(uri: string) {
  stopActivePlayer();

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
  });

  // Uploaded notes are served by an authenticated route, so remote playback
  // must send the bearer token (cookies are not shared with the native player).
  const token = isRemoteUri(uri) ? await getStoredAuthToken() : null;
  const source = token
    ? { uri, headers: { Authorization: `Bearer ${token}` } }
    : { uri };

  const player = new AudioModule.AudioPlayer(source, 500, false, 0, true);
  activePlayer = player;
  player.play();
}
