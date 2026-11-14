import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/auth-context";
import type { DevAutoSignInCredentials } from "@/lib/dev-auto-sign-in";

export type EmailPasswordAuthFormProps = {
  initialEmail?: string;
  /** Blocks the form while another sign-in path (e.g. Google) is in progress. */
  externalBusy?: boolean;
  devQuickSignIn?: DevAutoSignInCredentials | null;
};

export function EmailPasswordAuthForm({
  initialEmail = "",
  externalBusy = false,
  devQuickSignIn = null,
}: EmailPasswordAuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || externalBusy;
  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        await signUp({ email: email.trim(), password, name: name.trim() });
      } else {
        await signIn(email.trim(), password);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not sign in";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      {mode === "sign-up" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            editable={!disabled}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#a1a1aa"
            style={styles.input}
            value={name}
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!disabled}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#a1a1aa"
          style={styles.input}
          value={email}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "sign-up" ? "new-password" : "password"}
          editable={!disabled}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#a1a1aa"
          secureTextEntry
          style={styles.input}
          value={password}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={disabled || !canSubmit}
        onPress={() => void handleSubmit()}
        style={[styles.primaryButton, (disabled || !canSubmit) && styles.primaryButtonDisabled]}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          setError(null);
          setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
        }}
      >
        <Text style={styles.toggle}>
          {mode === "sign-in"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>

      {devQuickSignIn ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => {
            setMode("sign-in");
            setEmail(devQuickSignIn.email);
            setPassword(devQuickSignIn.password);
            setError(null);
            setBusy(true);
            void signIn(devQuickSignIn.email, devQuickSignIn.password)
              .catch((submitError) => {
                const message =
                  submitError instanceof Error
                    ? submitError.message
                    : "Could not sign in";
                setError(message);
              })
              .finally(() => setBusy(false));
          }}
          style={styles.devQuickButton}
        >
          <Text style={styles.devQuickLabel}>Dev: sign in as {devQuickSignIn.email}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#3f3f46",
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
    color: "#18181b",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#4873c7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggle: {
    color: "#52525b",
    fontSize: 14,
    textAlign: "center",
  },
  devQuickButton: {
    alignItems: "center",
    borderColor: "#d4d4d8",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  devQuickLabel: {
    color: "#52525b",
    fontSize: 14,
    fontWeight: "500",
  },
});
