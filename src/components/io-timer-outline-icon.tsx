import { Platform } from "react-native";
import { IoTimerOutline } from "react-icons/io5";
import Svg, { Path } from "react-native-svg";

const IO_TIMER_OUTLINE_PATHS = [
  "M112.91 128A191.85 191.85 0 0 0 64 254c-1.18 106.35 85.65 193.8 192 194 106.2.2 192-85.83 192-192 0-104.54-83.55-189.61-187.5-192a4.36 4.36 0 0 0-4.5 4.37V152",
  "m233.38 278.63-79-113a8.13 8.13 0 0 1 11.32-11.32l113 79a32.5 32.5 0 0 1-37.25 53.26 33.2 33.2 0 0 1-8.07-7.94",
] as const;

type IoTimerOutlineIconProps = {
  size?: number;
  color?: string;
};

export function IoTimerOutlineIcon({
  size = 16,
  color = "#9ca3af",
}: IoTimerOutlineIconProps) {
  if (Platform.OS === "web") {
    return <IoTimerOutline size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d={IO_TIMER_OUTLINE_PATHS[0]}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={IO_TIMER_OUTLINE_PATHS[1]} fill={color} />
    </Svg>
  );
}
