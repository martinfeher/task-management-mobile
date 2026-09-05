import { Platform } from "react-native";
import { IoAddOutline } from "react-icons/io5";
import Svg, { Path } from "react-native-svg";

const IO_ADD_OUTLINE_PATH = "M256 112v288m144-144H112";

type IoAddOutlineIconProps = {
  size?: number;
  color?: string;
};

export function IoAddOutlineIcon({
  size = 18,
  color = "#5f5f5f",
}: IoAddOutlineIconProps) {
  if (Platform.OS === "web") {
    return <IoAddOutline size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d={IO_ADD_OUTLINE_PATH}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
