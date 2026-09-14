import { Platform } from "react-native";
import { LuInbox } from "react-icons/lu";
import Svg, { Path, Polyline } from "react-native-svg";

const LU_INBOX_POLYLINE = "22 12 16 12 14 15 10 15 8 12 2 12";
const LU_INBOX_PATH =
  "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z";

type LuInboxIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function LuInboxIcon({
  size = 15,
  color = "#7c92a0",
  strokeWidth = 1,
}: LuInboxIconProps) {
  if (Platform.OS === "web") {
    return <LuInbox size={size} color={color} strokeWidth={strokeWidth} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points={LU_INBOX_POLYLINE}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={LU_INBOX_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
