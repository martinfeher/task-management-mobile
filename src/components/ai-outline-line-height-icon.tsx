import { Platform } from "react-native";
import { AiOutlineLineHeight } from "react-icons/ai";
import Svg, { Path } from "react-native-svg";

const AI_OUTLINE_LINE_HEIGHT_PATH =
  "M648 160H104c-4.4 0-8 3.6-8 8v128c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-64h168v560h-92c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h264c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-92V232h168v64c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V168c0-4.4-3.6-8-8-8zm272.8 546H856V318h64.8c6 0 9.4-7 5.7-11.7L825.7 178.7a7.14 7.14 0 0 0-11.3 0L713.6 306.3a7.23 7.23 0 0 0 5.7 11.7H784v388h-64.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5a7.2 7.2 0 0 0-5.6-11.7z";

type AiOutlineLineHeightIconProps = {
  size?: number;
  color?: string;
};

export function AiOutlineLineHeightIcon({
  size = 18,
  color = "#374151",
}: AiOutlineLineHeightIconProps) {
  if (Platform.OS === "web") {
    return <AiOutlineLineHeight size={size} color={color} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill={color}>
      <Path d={AI_OUTLINE_LINE_HEIGHT_PATH} />
    </Svg>
  );
}
