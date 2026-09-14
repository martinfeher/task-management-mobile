import { Platform } from "react-native";
import { RiArrowDropRightLine } from "react-icons/ri";
import Svg, { Path } from "react-native-svg";

const RI_ARROW_DROP_RIGHT_LINE_PATH =
  "M12.1717 12.0005L9.34326 9.17203L10.7575 7.75781L15.0001 12.0005L10.7575 16.2431L9.34326 14.8289L12.1717 12.0005Z";

type RiArrowDropRightLineIconProps = {
  size?: number;
  color?: string;
};

export function RiArrowDropRightLineIcon({
  size = 21,
  color = "#babbbd",
}: RiArrowDropRightLineIconProps) {
  if (Platform.OS === "web") {
    return <RiArrowDropRightLine size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={RI_ARROW_DROP_RIGHT_LINE_PATH} />
    </Svg>
  );
}
