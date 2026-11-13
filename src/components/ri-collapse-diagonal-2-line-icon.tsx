import { Platform } from "react-native";
import { RiCollapseDiagonal2Line } from "react-icons/ri";
import Svg, { Path } from "react-native-svg";

const RI_COLLAPSE_DIAGONAL_2_LINE_PATH =
  "M9.00008 4.00008H11.0001V11.0001H4.00008V9.00008H7.58586L3.29297 4.70718L4.70718 3.29297L9.00008 7.58586V4.00008ZM20 15H16.4142L20.7071 19.2929L19.2929 20.7071L15 16.4142V20H13V13H20V15Z";

type RiCollapseDiagonal2LineIconProps = {
  size?: number;
  color?: string;
};

export function RiCollapseDiagonal2LineIcon({
  size = 18,
  color = "#7a8494",
}: RiCollapseDiagonal2LineIconProps) {
  if (Platform.OS === "web") {
    return <RiCollapseDiagonal2Line size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={RI_COLLAPSE_DIAGONAL_2_LINE_PATH} />
    </Svg>
  );
}
