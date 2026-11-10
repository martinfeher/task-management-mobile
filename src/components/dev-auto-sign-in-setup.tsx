import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DevAutoSignInIssue } from "@/contexts/auth-context";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";

export function DevAutoSignInSetupScreen({
  issue = "missing-password",
}: {
  issue?: DevAutoSignInIssue;
}) {
  const defaultEmail = getDefaultDevelopmentUserEmail();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Development sign-in</Text>
        <Text style={styles.body}>
          <Text style={styles.mono}>APPLICATION_ENV=development</Text> skips the
          login screen. The app signs in as{" "}
          <Text style={styles.mono}>{defaultEmail}</Text> when a password is
          configured.
        </Text>
        {issue === "failed" ? (
          <Text style={styles.error}>
            Sign-in failed. Check that the API is running and the password
            matches this user on the server.
          </Text>
        ) : (
          <Text style={styles.body}>
            Copy{" "}
            <Text style={styles.mono}>src/lib/dev-auto-sign-in.local.example.ts</Text>{" "}
            to{" "}
            <Text style={styles.mono}>src/lib/dev-auto-sign-in.local.ts</Text> and
            set <Text style={styles.mono}>LOCAL_DEV_SIGN_IN_PASSWORD</Text>, or set{" "}
            <Text style={styles.mono}>EXPO_PUBLIC_DEV_SIGN_IN_PASSWORD</Text> in{" "}
            <Text style={styles.mono}>.env</Text>.
          </Text>
        )}
        <Text style={styles.hint}>
          Override the default user with{" "}
          <Text style={styles.mono}>EXPO_PUBLIC_DEV_DEFAULT_USER_EMAIL</Text>.
          Restart Metro after changing env. Set{" "}
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
  error: {
    color: "#dc2626",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
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
