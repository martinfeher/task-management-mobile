import { Pressable, StyleSheet, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";

const CHECKBOX_SIZE = 22;
const CHECKBOX_RADIUS = 12;
const CHECKBOX_BORDER = "#dad4d5";

type TaskCheckboxProps = {
  checked: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  uncheckedBackgroundColor?: string;
};

export function TaskCheckbox({
  checked,
  onPress,
  accessibilityLabel,
  uncheckedBackgroundColor = "#ffffff",
}: TaskCheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <View
        style={[
          styles.box,
          !checked && { backgroundColor: uncheckedBackgroundColor },
          checked && styles.boxChecked,
        ]}
      >
        {checked ? (
          <AppSymbol ios="checkmark" android="check" size={12} tintColor="#ffffff" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  box: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_RADIUS,
    borderWidth: 1.5,
    borderColor: CHECKBOX_BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
});
