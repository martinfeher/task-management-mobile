import { Platform } from "react-native";
import { PiTagThin } from "react-icons/pi";
import Svg, { Path } from "react-native-svg";

const PI_TAG_THIN_PATH =
  "M240.49,138.83,141.17,39.51A11.93,11.93,0,0,0,132.69,36H40a4,4,0,0,0-4,4v92.69a11.93,11.93,0,0,0,3.51,8.48l99.32,99.32a12,12,0,0,0,17,0l84.69-84.69a12,12,0,0,0,0-17Zm-5.66,11.31-84.69,84.69a4,4,0,0,1-5.65,0L45.17,135.51A4,4,0,0,1,44,132.69V44h88.69a4,4,0,0,1,2.82,1.17l99.32,99.32A4,4,0,0,1,234.83,150.14ZM92,84a8,8,0,1,1-8-8A8,8,0,0,1,92,84Z";

type PiTagThinIconProps = {
  size?: number;
  color?: string;
};

export function PiTagThinIcon({
  size = 18,
  color = "#c5c5c5",
}: PiTagThinIconProps) {
  if (Platform.OS === "web") {
    return <PiTagThin size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d={PI_TAG_THIN_PATH} />
    </Svg>
  );
}
