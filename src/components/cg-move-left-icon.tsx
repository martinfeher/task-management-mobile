import { Platform } from "react-native";
import { CgMoveLeft } from "react-icons/cg";
import Svg, { Path } from "react-native-svg";

const CG_MOVE_LEFT_PATHS = [
  "M19.071 17V15H11.071V17H19.071Z",
  "M19.071 9V7H11.071V9H19.071Z",
  "M19.071 12.9999V10.9999H9.07109V7.96454L5 11.9644L9.07109 15.9644V12.9999H19.071Z",
];

type CgMoveLeftIconProps = {
  size?: number;
  color?: string;
};

export function CgMoveLeftIcon({
  size = 22,
  color = "#4873c7",
}: CgMoveLeftIconProps) {
  if (Platform.OS === "web") {
    return <CgMoveLeft size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {CG_MOVE_LEFT_PATHS.map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
