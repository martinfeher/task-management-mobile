import { Platform } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

type TaskListSubtaskIconProps = {
  size?: number;
  color?: string;
};

export function TaskListSubtaskIcon({
  size = 13,
  color = "#afafaf",
}: TaskListSubtaskIconProps) {
  if (Platform.OS === "web") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        width={size}
        height={size}
        aria-hidden="true"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          d="M4 2.25V6.75"
          stroke={color}
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <path
          d="M4 6.75H10.25"
          stroke={color}
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <circle
          cx="11.5"
          cy="6.75"
          r="1.15"
          stroke={color}
          strokeWidth="1.15"
          fill="none"
        />
        <path
          d="M4 6.75V11.75H10.25"
          stroke={color}
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="11.5"
          cy="11.75"
          r="1.15"
          stroke={color}
          strokeWidth="1.15"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 2.25V6.75"
        stroke={color}
        strokeWidth={1.15}
        strokeLinecap="round"
      />
      <Path
        d="M4 6.75H10.25"
        stroke={color}
        strokeWidth={1.15}
        strokeLinecap="round"
      />
      <Circle
        cx={11.5}
        cy={6.75}
        r={1.15}
        stroke={color}
        strokeWidth={1.15}
        fill="none"
      />
      <Path
        d="M4 6.75V11.75H10.25"
        stroke={color}
        strokeWidth={1.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={11.5}
        cy={11.75}
        r={1.15}
        stroke={color}
        strokeWidth={1.15}
        fill="none"
      />
    </Svg>
  );
}
