import { Platform } from "react-native";
import { IoTodayOutline } from "react-icons/io5";
import Svg, { Path, Rect } from "react-native-svg";

const IO_TODAY_OUTLINE_HOOKS_PATH = "M128 48v32m256-32v32";
const IO_TODAY_OUTLINE_DIVIDER_PATH = "M464 160H48";

type IoTodayOutlineIconProps = {
  size?: number;
  color?: string;
};

export function IoTodayOutlineIcon({
  size = 20,
  color = "#b7b7b8",
}: IoTodayOutlineIconProps) {
  if (Platform.OS === "web") {
    return <IoTodayOutline size={size} color={color} />;
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
        d={IO_TODAY_OUTLINE_HOOKS_PATH}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={112}
        y={224}
        width={96}
        height={96}
        rx={13}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={IO_TODAY_OUTLINE_DIVIDER_PATH}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
