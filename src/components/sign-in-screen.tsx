import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/contexts/auth-context";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";
import {
  getDevAutoSignInCredentials,
  isDevAutoSignInEnabled,
} from "@/lib/dev-auto-sign-in";

export function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const devCredentials = isDevAutoSignInEnabled()
    ? getDevAutoSignInCredentials()
    : null;
  const [email, setEmail] = useState(
    devCredentials?.email ?? (__DEV__ ? getDefaultDevelopmentUserEmail() : ""),
  );
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        await signUp({ email, password, name });
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Could not sign in";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={styles.screen}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow justify-center px-6 py-10"
        >
          <View className="mx-auto w-full max-w-md gap-6">
            <View className="gap-2">
              <Text className="text-3xl font-semibold text-zinc-900">
                Todolist
              </Text>
              <Text className="text-[15px] text-zinc-500">
                Sign in with the same account you use on the web app.
              </Text>
            </View>

            {mode === "sign-up" ? (
              <View className="gap-2">
                <Text className="text-sm font-medium text-zinc-700">Name</Text>
                <TextInput
                  autoCapitalize="words"
                  autoComplete="name"
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
                  editable={!busy}
                  onChangeText={setName}
                  placeholder="Your name"
                  value={name}
                />
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-sm font-medium text-zinc-700">Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
                editable={!busy}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-zinc-700">Password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete={mode === "sign-up" ? "new-password" : "password"}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900"
                editable={!busy}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                value={password}
              />
            </View>

            {error ? (
              <Text className="text-center text-sm font-medium text-red-600">
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className="items-center rounded-xl bg-[#4873c7] px-4 py-3.5 active:opacity-85"
              disabled={busy || !email.trim() || !password}
              onPress={() => void handleSubmit()}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {mode === "sign-up" ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setError(null);
                setMode((current) =>
                  current === "sign-in" ? "sign-up" : "sign-in",
                );
              }}
            >
              <Text className="text-center text-sm text-zinc-600">
                {mode === "sign-in"
                  ? "Need an account? Create one"
                  : "Already have an account? Sign in"}
              </Text>
            </Pressable>

            {devCredentials ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  setMode("sign-in");
                  setEmail(devCredentials.email);
                  setPassword(devCredentials.password);
                  setError(null);
                  setBusy(true);
                  void signIn(devCredentials.email, devCredentials.password)
                    .catch((submitError) => {
                      const message =
                        submitError instanceof Error
                          ? submitError.message
                          : "Could not sign in";
                      setError(message);
                    })
                    .finally(() => setBusy(false));
                }}
                style={styles.devSignInButton}
              >
                <Text style={styles.devSignInLabel}>
                  Dev: sign in as {devCredentials.email}
                </Text>
              </Pressable>
            ) : null}

            <Text className="text-center text-xs text-zinc-400">
              API: {API_BASE_URL}
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
  devSignInButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  devSignInLabel: {
    color: "#52525b",
    fontSize: 14,
    fontWeight: "500",
  },
});
