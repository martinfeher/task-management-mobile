import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type GoogleSignInButtonProps = {
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function GoogleSignInButton({
  busy = false,
  disabled = false,
  onPress,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      disabled={disabled || busy}
      onPress={onPress}
      style={[styles.button, (disabled || busy) && styles.buttonDisabled]}
    >
      {busy ? (
        <ActivityIndicator color="#3f3f46" />
      ) : (
        <View style={styles.row}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.label}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  g: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285f4",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3f3f46",
  },
});
