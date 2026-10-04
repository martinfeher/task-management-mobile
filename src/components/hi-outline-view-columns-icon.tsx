import { Platform } from "react-native";
import { HiOutlineViewColumns } from "react-icons/hi2";
import Svg, { Path } from "react-native-svg";

const HI_OUTLINE_VIEW_COLUMNS_PATH =
  "M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z";

type HiOutlineViewColumnsIconProps = {
  size?: number;
  color?: string;
};

export function HiOutlineViewColumnsIcon({
  size = 20,
  color = "#b7b7b8",
}: HiOutlineViewColumnsIconProps) {
  if (Platform.OS === "web") {
    return <HiOutlineViewColumns size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={HI_OUTLINE_VIEW_COLUMNS_PATH}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
