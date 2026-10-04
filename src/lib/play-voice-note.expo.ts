import { AudioModule, setAudioModeAsync } from "expo-audio";

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

export async function playVoiceNoteUriExpo(uri: string) {
  stopActivePlayer();

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
  });

  const player = new AudioModule.AudioPlayer({ uri }, 500, false, 0);
  activePlayer = player;
  player.play();
}
