import Svg, { Path } from "react-native-svg";

const VOICE_INPUT_PATH =
  "M5 7h2v10H5V7zm-4 3h2v4H1v-4zm8-8h2v18H9V2zm4 2h2v18h-2V4zm4 3h2v10h-2V7zm4 3h2v4h-2v-4z";

type VoiceInputIconProps = {
  size?: number;
  color?: string;
};

export function VoiceInputIcon({
  size = 24,
  color = "#ffffff",
}: VoiceInputIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={VOICE_INPUT_PATH} fill={color} />
    </Svg>
  );
}
