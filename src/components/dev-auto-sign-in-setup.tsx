import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DevAutoSignInIssue } from "@/contexts/auth-context";
import { useAuth } from "@/contexts/auth-context";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { API_BASE_URL } from "@/constants/api";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";
import { isDevGoogleSignInEnabled } from "@/lib/dev-google-sign-in";

export function DevAutoSignInSetupScreen({
  issue = "missing-password",
}: {
  issue?: DevAutoSignInIssue;
}) {
  const { signInWithGoogle } = useAuth();
  const defaultEmail = getDefaultDevelopmentUserEmail();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const showGoogle = isDevGoogleSignInEnabled();

  async function handleGoogleSignIn() {
    setGoogleError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not sign in with Google";
      setGoogleError(message);
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Development sign-in</Text>

        {showGoogle ? (
          <>
            <Text style={styles.body}>
              Sign in with Google to load the lists and tasks linked to that
              account in the database (for example{" "}
              <Text style={styles.mono}>test@test.io</Text>).
            </Text>
            <GoogleSignInButton busy={googleBusy} onPress={() => void handleGoogleSignIn()} />
            {googleError ? (
              <Text style={styles.error}>{googleError}</Text>
            ) : null}
            <Text style={styles.separatorLabel}>or use email auto sign-in</Text>
          </>
        ) : null}

        <Text style={styles.body}>
          <Text style={styles.mono}>APPLICATION_ENV=development</Text> can skip
          the login screen. Auto sign-in uses{" "}
          <Text style={styles.mono}>{defaultEmail}</Text> when a password is set
          in <Text style={styles.mono}>dev-auto-sign-in.local.ts</Text>.
        </Text>
        {issue === "failed" ? (
          <Text style={styles.error}>
            Email auto sign-in failed. Check the API at {API_BASE_URL} and the
            password for {defaultEmail}.
          </Text>
        ) : null}
        <Text style={styles.hint}>
          Restart the Next.js API after auth changes. If Google sign-in fails
          after OAuth, run <Text style={styles.mono}>npx expo run:ios</Text> once
          so native modules (secure-store, network) are in the dev client.
          Restart Metro after env
          changes.
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
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  hint: {
    color: "#71717a",
    fontSize: 13,
    lineHeight: 20,
  },
  separatorLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 12,
  },
});
