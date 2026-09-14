import { Platform } from "react-native";
import { BiChevronDown } from "react-icons/bi";
import Svg, { Path } from "react-native-svg";

const BI_CHEVRON_DOWN_PATH =
  "M16.293 9.293 12 13.586 7.707 9.293l-1.414 1.414L12 16.414l5.707-5.707z";

type BiChevronDownIconProps = {
  size?: number;
  color?: string;
};

export function BiChevronDownIcon({
  size = 16,
  color = "#c0c5e0",
}: BiChevronDownIconProps) {
  if (Platform.OS === "web") {
    return <BiChevronDown size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={BI_CHEVRON_DOWN_PATH} />
    </Svg>
  );
}
