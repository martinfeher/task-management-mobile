import { Platform } from "react-native";
import { TbSubtask } from "react-icons/tb";
import Svg, { Path } from "react-native-svg";

const SUBTASK_PATHS = [
  "M12.37 8.87988H17.62",
  "M6.38 8.87988L7.13 9.62988L9.38 7.37988",
  "M12.37 15.8799H17.62",
  "M6.38 15.8799L7.13 16.6299L9.38 14.3799",
  "M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z",
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
      {SUBTASK_PATHS.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
