import { Platform } from "react-native";
import { IoAdd } from "react-icons/io5";
import Svg, { Path } from "react-native-svg";

const IO_ADD_PATH = "M256 112v288m144-144H112";

type IoAddIconProps = {
  size?: number;
  color?: string;
};

export function IoAddIcon({ size = 18, color = "#5f5f5f" }: IoAddIconProps) {
  if (Platform.OS === "web") {
    return <IoAdd size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d={IO_ADD_PATH}
        stroke={color}
        strokeWidth={48}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
