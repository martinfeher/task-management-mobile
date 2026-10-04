import { Platform } from "react-native";
import { MdCalendarMonth } from "react-icons/md";
import Svg, { Path } from "react-native-svg";

const MD_CALENDAR_MONTH_PATH =
  "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V10h14zM9 14H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2zm-8 4H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2z";

type MdCalendarMonthIconProps = {
  size?: number;
  color?: string;
};

export function MdCalendarMonthIcon({
  size = 20,
  color = "#b7b7b8",
}: MdCalendarMonthIconProps) {
  if (Platform.OS === "web") {
    return <MdCalendarMonth size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={MD_CALENDAR_MONTH_PATH} />
    </Svg>
  );
}
