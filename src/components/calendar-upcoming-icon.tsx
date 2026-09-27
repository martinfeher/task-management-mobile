import Svg, { Path } from "react-native-svg";

const CALENDAR_UPCOMING_FRAME_PATH =
  "M25.6 102.4h25.6c.03-14.13 11.47-25.57 25.6-25.6h358.4c14.13.03 25.57 11.47 25.6 25.6v307.2c-.03 14.13-11.47 25.57-25.6 25.6H76.8c-14.13-.03-25.57-11.47-25.6-25.6V102.4zH0v307.2c.02 42.43 34.37 76.78 76.8 76.8h358.4c42.43-.02 76.78-34.37 76.8-76.8V102.4c-.02-42.43-34.37-76.78-76.8-76.8H76.8C34.37 25.62.02 59.97 0 102.4z";

const CALENDAR_UPCOMING_LINES_PATH =
  "M128 179.2h256c14.14 0 25.6-11.46 25.6-25.6S398.14 128 384 128H128c-14.14 0-25.6 11.46-25.6 25.6s11.46 25.6 25.6 25.6M128 281.6h256c14.14 0 25.6-11.46 25.6-25.6s-11.46-25.6-25.6-25.6H128c-14.14 0-25.6 11.46-25.6 25.6s11.46 25.6 25.6 25.6M128 384h256c14.14 0 25.6-11.46 25.6-25.6s-11.46-25.6-25.6-25.6H128c-14.14 0-25.6 11.46-25.6 25.6S113.86 384 128 384";

type CalendarUpcomingIconProps = {
  size?: number;
  color?: string;
};

export function CalendarUpcomingIcon({
  size = 22,
  color = "#D5D7E3",
}: CalendarUpcomingIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
      <Path d={CALENDAR_UPCOMING_FRAME_PATH} />
      <Path d={CALENDAR_UPCOMING_LINES_PATH} />
    </Svg>
  );
}
