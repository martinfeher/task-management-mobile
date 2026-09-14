import { Platform } from "react-native";
import { LuPlus } from "react-icons/lu";
import Svg, { Path } from "react-native-svg";

const LU_PLUS_PATHS = ["M5 12h14", "M12 5v14"] as const;

type LuPlusIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function LuPlusIcon({
  size = 14,
  color = "#acadb2",
  strokeWidth = 2,
}: LuPlusIconProps) {
  if (Platform.OS === "web") {
    return <LuPlus size={size} color={color} strokeWidth={strokeWidth} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {LU_PLUS_PATHS.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
