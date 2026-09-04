import { StyleSheet, Text, View } from "react-native";

type TodayCalendarIconProps = {
  size?: number;
  color?: string;
  day?: number;
};

export function TodayCalendarIcon({
  size = 22,
  color = "#7c92a0",
  day = new Date().getDate(),
}: TodayCalendarIconProps) {
  const dayLabel = String(day);
  const fontSize = dayLabel.length > 1 ? size * 0.34 : size * 0.38;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderColor: color,
        },
      ]}>
      <View style={[styles.headerLine, { backgroundColor: color }]} />
      <View style={styles.hooks}>
        <View style={[styles.hook, { backgroundColor: color }]} />
        <View style={[styles.hook, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.day, { color, fontSize }]}>{dayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.75,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerLine: {
    position: "absolute",
    top: "36%",
    left: 0,
    right: 0,
    height: 1.75,
  },
  hooks: {
    position: "absolute",
    top: 2,
    left: "22%",
    right: "22%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hook: {
    width: 1.75,
    height: 4,
    borderRadius: 1,
  },
  day: {
    marginTop: 3,
    fontWeight: "700",
  },
});
