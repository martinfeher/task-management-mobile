import { Platform } from "react-native";
import { PiArrowBendDownRightThin } from "react-icons/pi";
import Svg, { Path } from "react-native-svg";

const PI_ARROW_BEND_DOWN_RIGHT_THIN_PATH =
  "M226.83,154.83l-48,48a4,4,0,0,1-5.66-5.66L214.34,156H128A100.11,100.11,0,0,1,28,56a4,4,0,0,1,8,0,92.1,92.1,0,0,0,92,92h86.34l-41.17-41.17a4,4,0,0,1,5.66-5.66l48,48A4,4,0,0,1,226.83,154.83Z";

type PiArrowBendDownRightThinIconProps = {
  size?: number;
  color?: string;
};

export function PiArrowBendDownRightThinIcon({
  size = 16,
  color = "#b4b4b4",
}: PiArrowBendDownRightThinIconProps) {
  if (Platform.OS === "web") {
    return <PiArrowBendDownRightThin size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d={PI_ARROW_BEND_DOWN_RIGHT_THIN_PATH} />
    </Svg>
  );
}
