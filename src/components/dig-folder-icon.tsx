import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

const FOLDER_SHADOW_PATH =
  "M9.502.004c.552.018.993.252 1.295.7l.785 2.12c.145.298.363.576.561.779.252.257.633.4 1.156.4H30l-.002 18c-.027.976-.3 1.594-.836 2.142-.565.577-1.383.858-2.41.858H3.248c-1.026 0-1.844-.28-2.409-.858C.274 23.568 0 22.73 0 21.68V.003z";

const FOLDER_CONTAINER_PATH =
  "M9.502.001c.552.018.993.252 1.295.7l.785 2.12c.145.298.363.576.561.779.252.257.633.4 1.156.4H30l-.002 16.84c-.027.976-.3 1.754-.836 2.302-.565.577-1.383.858-2.41.858H3.248c-1.026 0-1.844-.28-2.409-.858C.274 22.565 0 21.727 0 20.677V0z";

type DigFolderIconProps = {
  width?: number;
  height?: number;
  shadowColor?: string;
  containerColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function DigFolderIcon({
  width = 19,
  height = 16,
  shadowColor = "#75aaff",
  containerColor = "#B7C0F9",
  style,
}: DigFolderIconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 30 26"
      fill="none"
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path fill={shadowColor} d={FOLDER_SHADOW_PATH} />
      <Path fill={containerColor} d={FOLDER_CONTAINER_PATH} />
    </Svg>
  );
}
