import { Platform } from "react-native";
import { PiArrowBendDownRightBold } from "react-icons/pi";
import Svg, { Path } from "react-native-svg";

const PI_ARROW_BEND_DOWN_RIGHT_BOLD_PATH =
  "M232.49,160.49l-48,48a12,12,0,0,1-17-17L195,164H128A108.12,108.12,0,0,1,20,56a12,12,0,0,1,24,0,84.09,84.09,0,0,0,84,84h67l-27.52-27.51a12,12,0,0,1,17-17l48,48A12,12,0,0,1,232.49,160.49Z";

type PiArrowBendDownRightBoldIconProps = {
  size?: number;
  color?: string;
};

export function PiArrowBendDownRightBoldIcon({
  size = 16,
  color = "#b4b4b4",
}: PiArrowBendDownRightBoldIconProps) {
  if (Platform.OS === "web") {
    return <PiArrowBendDownRightBold size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d={PI_ARROW_BEND_DOWN_RIGHT_BOLD_PATH} />
    </Svg>
  );
}
