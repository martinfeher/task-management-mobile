import { Platform } from "react-native";
import { FiFlag } from "react-icons/fi";
import Svg, { Line, Path } from "react-native-svg";

const FI_FLAG_PATH =
  "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z";

type FiFlagIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function FiFlagIcon({
  size = 25.5,
  color = "#5a6578",
  strokeWidth = 2,
}: FiFlagIconProps) {
  if (Platform.OS === "web") {
    return <FiFlag size={size} color={color} strokeWidth={strokeWidth} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={FI_FLAG_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Line
        x1={4}
        y1={22}
        x2={4}
        y2={15}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
