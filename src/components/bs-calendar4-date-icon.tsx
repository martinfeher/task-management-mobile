import { BsCalendar4 } from "react-icons/bs";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const BS_CALENDAR4_PATH =
  "M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z";

type BsCalendar4DateIconProps = {
  size?: number;
  color?: string;
  day?: number;
};

export function BsCalendar4DateIcon({
  size = 21,
  color = "#7c92a0",
  day = new Date().getDate(),
}: BsCalendar4DateIconProps) {
  const dayLabel = String(day);
  const fontSize = dayLabel.length > 1 ? size * 0.43 : size * 0.48;
  const daySlotTop = size * 0.42;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Platform.OS === "web" ? (
        <BsCalendar4 size={size} color={color} />
      ) : (
        <Svg width={size} height={size} strokeWidth={0.4} viewBox="0 0 16 16">
          <Path d={BS_CALENDAR4_PATH} fill={color} />
        </Svg>
      )}
      <View
        pointerEvents="none"
        style={[
          styles.daySlot,
          {
            top: daySlotTop,
            height: size - daySlotTop,
          },
        ]}
      >
        <Text
          style={[
            styles.day,
            {
              color,
              fontSize,
              lineHeight: fontSize,
            },
          ]}
          {...(Platform.OS === "android"
            ? { includeFontPadding: false }
            : null)}
        >
          {dayLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  daySlot: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 2,
  },
});
