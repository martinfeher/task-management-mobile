import { Platform } from "react-native";
import { IoCalendarClearOutline } from "react-icons/io5";
import Svg, { Path, Rect } from "react-native-svg";

const IO_CALENDAR_CLEAR_OUTLINE_PATH = "M128 48v32m256-32v32m80 80H48";

type IoCalendarClearOutlineIconProps = {
  size?: number;
  color?: string;
};

export function IoCalendarClearOutlineIcon({
  size = 36,
  color = "#D4D4D4",
}: IoCalendarClearOutlineIconProps) {
  if (Platform.OS === "web") {
    return <IoCalendarClearOutline size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Rect
        x={48}
        y={80}
        width={416}
        height={384}
        rx={48}
        stroke={color}
        strokeWidth={32}
        strokeLinejoin="round"
      />
      <Path
        d={IO_CALENDAR_CLEAR_OUTLINE_PATH}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
