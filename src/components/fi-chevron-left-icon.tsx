import { Platform } from "react-native";
import { FiChevronLeft } from "react-icons/fi";
import Svg, { Polyline } from "react-native-svg";

type FiChevronLeftIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function FiChevronLeftIcon({
  size = 22,
  color = "#4873c7",
  strokeWidth = 2,
}: FiChevronLeftIconProps) {
  if (Platform.OS === "web") {
    return <FiChevronLeft size={size} color={color} strokeWidth={strokeWidth} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 18 9 12 15 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
