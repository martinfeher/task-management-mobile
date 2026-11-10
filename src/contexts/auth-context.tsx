import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { clearAllTaskSessions } from "@/lib/app-data-session";
import { setApiUnauthorizedListener } from "@/lib/api-fetch";
import { clearDedupeCache } from "@/lib/request-dedupe";
import {
  clearStoredAuthToken,
  fetchAuthSession,
  getStoredAuthToken,
  signInWithEmail,
  signOutOnServer,
  signUpWithEmail,
  type AuthUser,
} from "@/lib/auth-session";
import {
  getDevAutoSignInCredentials,
  isDevAutoSignInEnabled,
} from "@/lib/dev-auto-sign-in";

type AuthStatus = "loading" | "signed-out" | "signed-in";

export type DevAutoSignInIssue = "missing-password" | "failed" | null;

type AuthContextValue = {
  status: AuthStatus;
  devAutoSignInIssue: DevAutoSignInIssue;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearAppDataCaches() {
  clearDedupeCache();
  clearAllTaskSessions();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [devAutoSignInIssue, setDevAutoSignInIssue] =
    useState<DevAutoSignInIssue>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const tryDevAutoSignIn = useCallback(async (): Promise<AuthUser | null> => {
    if (!isDevAutoSignInEnabled()) {
      setDevAutoSignInIssue(null);
      return null;
    }

    const credentials = getDevAutoSignInCredentials();
    if (!credentials) {
      setDevAutoSignInIssue("missing-password");
      return null;
    }

    try {
      const signedInUser = await signInWithEmail(
        credentials.email,
        credentials.password,
      );
      setDevAutoSignInIssue(null);
      return signedInUser;
    } catch {
      setDevAutoSignInIssue("failed");
      return null;
    }
  }, []);

  const handleSignedOut = useCallback(async () => {
    clearAppDataCaches();
    setUser(null);

    if (isDevAutoSignInEnabled()) {
      setStatus("loading");
      const devUser = await tryDevAutoSignIn();
      if (devUser) {
        setUser(devUser);
        setStatus("signed-in");
        return;
      }
    }

    setStatus("signed-out");
  }, [tryDevAutoSignIn]);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    try {
      const token = await getStoredAuthToken();
      if (!token) {
        const devUser = await tryDevAutoSignIn();
        if (devUser) {
          clearAppDataCaches();
          setUser(devUser);
          setStatus("signed-in");
          return;
        }
        setUser(null);
        setStatus("signed-out");
        return;
      }

      const sessionUser = await fetchAuthSession(token);
      if (!sessionUser) {
        await clearStoredAuthToken();
        const devUser = await tryDevAutoSignIn();
        if (devUser) {
          clearAppDataCaches();
          setUser(devUser);
          setStatus("signed-in");
          return;
        }
        setUser(null);
        setStatus("signed-out");
        return;
      }

      setUser(sessionUser);
      setStatus("signed-in");
    } catch {
      await clearStoredAuthToken();
      setUser(null);
      setStatus("signed-out");
    }
  }, [tryDevAutoSignIn]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setApiUnauthorizedListener(handleSignedOut);
    return () => setApiUnauthorizedListener(null);
  }, [handleSignedOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const signedInUser = await signInWithEmail(email, password);
    clearAppDataCaches();
    setUser(signedInUser);
    setStatus("signed-in");
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      const signedInUser = await signUpWithEmail(input);
      clearAppDataCaches();
      setUser(signedInUser);
      setStatus("signed-in");
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const { signInWithGoogle: completeGoogleSignIn } = await import(
      "@/lib/auth-google-sign-in"
    );
    const signedInUser = await completeGoogleSignIn();
    clearAppDataCaches();
    setDevAutoSignInIssue(null);
    setUser(signedInUser);
    setStatus("signed-in");
  }, []);

  const signOut = useCallback(async () => {
    await signOutOnServer();
    const { signOutGoogleSession } = await import("@/lib/auth-google-sign-in");
    await signOutGoogleSession();
    handleSignedOut();
  }, [handleSignedOut]);

  const value = useMemo(
    () => ({
      status,
      devAutoSignInIssue,
      user,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
    }),
    [devAutoSignInIssue, signIn, signInWithGoogle, signOut, signUp, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
