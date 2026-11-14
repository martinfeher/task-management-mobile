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

import { EmailPasswordAuthForm } from "@/components/email-password-auth-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/contexts/auth-context";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";
import { isDevGoogleSignInEnabled } from "@/lib/dev-google-sign-in";
import {
  getDevAutoSignInCredentials,
  isDevAutoSignInEnabled,
} from "@/lib/dev-auto-sign-in";

export function SignInScreen() {
  const { signInWithGoogle } = useAuth();
  const devCredentials = isDevAutoSignInEnabled()
    ? getDevAutoSignInCredentials()
    : null;
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const showGoogle = isDevGoogleSignInEnabled();

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
            <Text style={styles.title}>Todolist</Text>
            <Text style={styles.subtitle}>
              Sign in with the same account you use on the web app.
            </Text>

            {showGoogle ? (
              <>
                <GoogleSignInButton
                  busy={googleBusy}
                  onPress={() => {
                    setGoogleError(null);
                    setGoogleBusy(true);
                    void signInWithGoogle()
                      .catch((submitError) => {
                        const message =
                          submitError instanceof Error
                            ? submitError.message
                            : "Could not sign in with Google";
                        setGoogleError(message);
                      })
                      .finally(() => setGoogleBusy(false));
                  }}
                />
                {googleError ? <Text style={styles.error}>{googleError}</Text> : null}
                <Text style={styles.separatorLabel}>or use email and password</Text>
              </>
            ) : null}

            <EmailPasswordAuthForm
              devQuickSignIn={devCredentials}
              externalBusy={googleBusy}
              initialEmail={
                devCredentials?.email ?? (__DEV__ ? getDefaultDevelopmentUserEmail() : "")
              }
            />

            <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    gap: 16,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    color: "#18181b",
    fontSize: 28,
    fontWeight: "600",
  },
  subtitle: {
    color: "#71717a",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  separatorLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  apiHint: {
    color: "#a1a1aa",
    fontSize: 12,
    textAlign: "center",
  },
});
