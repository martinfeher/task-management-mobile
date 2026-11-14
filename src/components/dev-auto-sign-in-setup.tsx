import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DevAutoSignInIssue } from "@/contexts/auth-context";
import { useAuth } from "@/contexts/auth-context";
import { EmailPasswordAuthForm } from "@/components/email-password-auth-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { API_BASE_URL } from "@/constants/api";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";
import { isDevGoogleSignInEnabled } from "@/lib/dev-google-sign-in";
import {
  getDevAutoSignInCredentials,
  isDevAutoSignInEnabled,
} from "@/lib/dev-auto-sign-in";

export function DevAutoSignInSetupScreen({
  issue = "missing-password",
}: {
  issue?: DevAutoSignInIssue;
}) {
  const { signInWithGoogle } = useAuth();
  const defaultEmail = getDefaultDevelopmentUserEmail();
  const devCredentials = isDevAutoSignInEnabled()
    ? getDevAutoSignInCredentials()
    : null;
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Development sign-in</Text>

            {showGoogle ? (
              <>
                <Text style={styles.body}>
                  Sign in with Google to load the lists and tasks linked to that
                  account in the database (for example{" "}
                  <Text style={styles.mono}>mn.feher@gmail.com</Text>).
                </Text>
                <GoogleSignInButton
                  busy={googleBusy}
                  disabled={googleBusy}
                  onPress={() => void handleGoogleSignIn()}
                />
                {googleError ? <Text style={styles.error}>{googleError}</Text> : null}
                <Text style={styles.separatorLabel}>or use email and password</Text>
              </>
            ) : null}

            <EmailPasswordAuthForm
              devQuickSignIn={devCredentials}
              externalBusy={googleBusy}
              initialEmail={defaultEmail}
            />

            <Text style={styles.body}>
              Prefer silent sign-in: set matching{" "}
              <Text style={styles.mono}>DEV_MOBILE_SESSION_*</Text> on the Next.js server and{" "}
              <Text style={styles.mono}>EXPO_PUBLIC_DEV_MOBILE_SESSION_SECRET</Text> in{" "}
              <Text style={styles.mono}>.env.local</Text> (password stays on the server only).
              The user needs a <Text style={styles.mono}>credential</Text> account in the database.
            </Text>
            <Text style={styles.body}>
              Fallback: password in <Text style={styles.mono}>dev-auto-sign-in.local.ts</Text>{" "}
              auto sign-in as <Text style={styles.mono}>{defaultEmail}</Text> on next launch.
            </Text>
            {issue === "dev-session-failed" ? (
              <Text style={styles.error}>
                Dev session mint failed. Check the API at {API_BASE_URL}, shared secret, and{" "}
                <Text style={styles.mono}>DEV_MOBILE_SESSION_PASSWORD</Text> on the server for a user
                with email/password (not Google-only).
              </Text>
            ) : null}
            {issue === "failed" ? (
              <Text style={styles.error}>
                Email auto sign-in failed. Check the API at {API_BASE_URL} and the
                password for {defaultEmail}.
              </Text>
            ) : null}
            <Text style={styles.hint}>
              Restart the Next.js API after auth changes. Google{" "}
              <Text style={styles.mono}>state_mismatch</Text> on a phone: copy{" "}
              <Text style={styles.mono}>todolistWeb/.env.local.example</Text> to{" "}
              <Text style={styles.mono}>.env.local</Text> so{" "}
              <Text style={styles.mono}>BETTER_AUTH_URL</Text> matches{" "}
              <Text style={styles.mono}>EXPO_PUBLIC_API_URL</Text> ({API_BASE_URL}). The
              simulator always uses localhost for auth. Restart Metro after env changes.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  scrollContent: {
    flexGrow: 1,
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
