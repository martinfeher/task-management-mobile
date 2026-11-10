import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function DevAutoSignInSetupScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Dev auto sign-in</Text>
        <Text style={styles.body}>
          Copy{" "}
          <Text style={styles.mono}>src/lib/dev-auto-sign-in.local.example.ts</Text>{" "}
          to{" "}
          <Text style={styles.mono}>src/lib/dev-auto-sign-in.local.ts</Text> and set{" "}
          <Text style={styles.mono}>LOCAL_DEV_SIGN_IN_PASSWORD</Text> for{" "}
          <Text style={styles.mono}>test@test.io</Text>.
        </Text>
        <Text style={styles.hint}>
          Or set{" "}
          <Text style={styles.mono}>EXPO_PUBLIC_DEV_SIGN_IN_PASSWORD</Text> in{" "}
          <Text style={styles.mono}>.env.local</Text>. Restart Metro after
          changing env. Set{" "}
          <Text style={styles.mono}>EXPO_PUBLIC_DEV_AUTO_SIGN_IN=false</Text> to
          use the normal sign-in screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafafa",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    color: "#18181b",
    fontSize: 20,
    fontWeight: "600",
  },
  body: {
    color: "#3f3f46",
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    color: "#71717a",
    fontSize: 13,
    lineHeight: 20,
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 12,
  },
});
