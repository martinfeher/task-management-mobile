import { Platform } from "react-native";
import { BsCalendar3Week } from "react-icons/bs";
import Svg, { Path } from "react-native-svg";

const BS_CALENDAR3_WEEK_FRAME_PATH =
  "M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857z";
const BS_CALENDAR3_WEEK_DOTS_PATH =
  "M12 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-5 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m2-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-5 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2";

type BsCalendar3WeekIconProps = {
  size?: number;
  color?: string;
};

export function BsCalendar3WeekIcon({
  size = 20,
  color = "#b7b7b8",
}: BsCalendar3WeekIconProps) {
  if (Platform.OS === "web") {
    return <BsCalendar3Week size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d={BS_CALENDAR3_WEEK_FRAME_PATH} />
      <Path d={BS_CALENDAR3_WEEK_DOTS_PATH} />
    </Svg>
  );
}
