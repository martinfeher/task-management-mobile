import { Platform } from "react-native";
import { IoTimeOutline } from "react-icons/io5";
import Svg, { Path } from "react-native-svg";

const IO_MD_TIME_CIRCLE_PATH =
  "M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z";
const IO_MD_TIME_HANDS_PATH = "M256 128v144h96";
const IO_MD_TIME_BASE_STROKE_WIDTH = 32;
const IO_MD_TIME_DEFAULT_STROKE_WIDTH = IO_MD_TIME_BASE_STROKE_WIDTH * 0.7;

type IoMdTimeIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function IoMdTimeIcon({
  size = 16,
  color = "#9ca3af",
  strokeWidth = IO_MD_TIME_DEFAULT_STROKE_WIDTH,
}: IoMdTimeIconProps) {
  if (Platform.OS === "web") {
    return (
      <IoTimeOutline size={size} color={color} strokeWidth={strokeWidth} />
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d={IO_MD_TIME_CIRCLE_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeMiterlimit={10}
        fill="none"
      />
      <Path
        d={IO_MD_TIME_HANDS_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
