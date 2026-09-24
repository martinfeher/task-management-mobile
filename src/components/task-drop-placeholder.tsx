import { StyleSheet, View } from "react-native";

const DROP_INDICATOR_COLOR = "#007AFF";
const DROP_LINE_COLOR = "rgba(0, 122, 255, 0.8)";
const DROP_LINE_HEIGHT = 2;
const DROP_DOT_SIZE = 7;
const DROP_HORIZONTAL_INSET = 14;
const DROP_INDICATOR_OFFSET_X = 5;

export function TaskDropPlaceholder() {
  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.indicatorRow}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: "center",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: DROP_HORIZONTAL_INSET + DROP_INDICATOR_OFFSET_X,
    marginRight: DROP_HORIZONTAL_INSET,
  },
  line: {
    flex: 1,
    height: DROP_LINE_HEIGHT,
    borderRadius: DROP_LINE_HEIGHT / 2,
    backgroundColor: DROP_LINE_COLOR,
  },
  dot: {
    width: DROP_DOT_SIZE,
    height: DROP_DOT_SIZE,
    borderRadius: DROP_DOT_SIZE / 2,
    backgroundColor: DROP_INDICATOR_COLOR,
  },
});
