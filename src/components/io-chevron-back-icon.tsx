import { Platform } from "react-native";
import { IoChevronBack } from "react-icons/io5";
import Svg, { Path } from "react-native-svg";

const IO_CHEVRON_BACK_PATH = "M328 112 184 256l144 144";

type IoChevronBackIconProps = {
  size?: number;
  color?: string;
};

export function IoChevronBackIcon({
  size = 22,
  color = "#4873c7",
}: IoChevronBackIconProps) {
  if (Platform.OS === "web") {
    return <IoChevronBack size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d={IO_CHEVRON_BACK_PATH}
        stroke={color}
        strokeWidth={48}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
