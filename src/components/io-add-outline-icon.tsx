import Svg, { Path } from "react-native-svg";

const IO_ADD_OUTLINE_PATH = "M256 112v288m144-144H112";

type IoAddOutlineIconProps = {
  size?: number;
  width?: number;
  height?: number;
  color?: string;
};

export function IoAddOutlineIcon({
  size = 18,
  width,
  height,
  color = "#5f5f5f",
}: IoAddOutlineIconProps) {
  const iconWidth = width ?? size;
  const iconHeight = height ?? size;

  return (
    <Svg
      width={iconWidth}
      height={iconHeight}
      viewBox="0 0 512 512"
      fill="none"
    >
      <Path
        d={IO_ADD_OUTLINE_PATH}
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
