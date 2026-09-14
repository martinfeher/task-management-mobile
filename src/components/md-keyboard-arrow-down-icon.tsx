import { Platform } from "react-native";
import { MdKeyboardArrowDown } from "react-icons/md";
import Svg, { Path } from "react-native-svg";

const MD_KEYBOARD_ARROW_DOWN_PATH = "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z";

type MdKeyboardArrowDownIconProps = {
  size?: number;
  color?: string;
};

export function MdKeyboardArrowDownIcon({
  size = 15,
  color = "#a4a5a8",
}: MdKeyboardArrowDownIconProps) {
  if (Platform.OS === "web") {
    return <MdKeyboardArrowDown size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={MD_KEYBOARD_ARROW_DOWN_PATH} />
    </Svg>
  );
}
