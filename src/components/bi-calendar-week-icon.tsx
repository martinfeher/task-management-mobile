import { Platform } from "react-native";
import { BiCalendarWeek } from "react-icons/bi";
import Svg, { Path } from "react-native-svg";

const BI_CALENDAR_WEEK_FRAME_PATH =
  "M19 4h-3V2h-2v2h-4V2H8v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 20V7h14V6l.002 14H5z";
const BI_CALENDAR_WEEK_BAR_PATH = "M7 10v2h10V9H7z";

type BiCalendarWeekIconProps = {
  size?: number;
  color?: string;
};

export function BiCalendarWeekIcon({
  size = 20,
  color = "#b7b7b8",
}: BiCalendarWeekIconProps) {
  if (Platform.OS === "web") {
    return <BiCalendarWeek size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={BI_CALENDAR_WEEK_FRAME_PATH} />
      <Path d={BI_CALENDAR_WEEK_BAR_PATH} />
    </Svg>
  );
}
