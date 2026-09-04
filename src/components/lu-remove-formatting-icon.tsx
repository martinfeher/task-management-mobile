import { Platform } from "react-native";
import { LuRemoveFormatting } from "react-icons/lu";
import Svg, { Path } from "react-native-svg";

const LU_REMOVE_FORMATTING_PATHS = [
  "M10.95 10.95l7.8 7.8",
  "M11.28 6.75a7 7 0 0 0-7.58 6.94",
  "M12 2v2",
  "M20 12h2",
  "M4.93 4.93l1.41 1.41",
  "M6.34 17.66l-1.41 1.41",
  "M6.75 11.28a7 7 0 0 0 7.58-6.94",
  "M9 2h6",
  "M9 12V9",
] as const;

type LuRemoveFormattingIconProps = {
  size?: number;
  color?: string;
};

export function LuRemoveFormattingIcon({
  size = 18,
  color = "#374151",
}: LuRemoveFormattingIconProps) {
  if (Platform.OS === "web") {
    return <LuRemoveFormatting size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {LU_REMOVE_FORMATTING_PATHS.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
