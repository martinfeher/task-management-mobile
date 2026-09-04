import { Platform } from "react-native";
import { TbSubtask } from "react-icons/tb";
import Svg, { Path } from "react-native-svg";

const TB_SUBTASK_PATHS = [
  "M6 9l6 0",
  "M4 5l4 0",
  "M6 5v11a1 1 0 0 0 1 1h5",
  "M12 8a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -2",
  "M12 16a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -2",
] as const;

type TbSubtaskIconProps = {
  size?: number;
  color?: string;
};

export function TbSubtaskIcon({ size = 22, color = "#5a6578" }: TbSubtaskIconProps) {
  if (Platform.OS === "web") {
    return <TbSubtask size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {TB_SUBTASK_PATHS.map((path) => (
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
