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
import {
  bindOfflineStoreToUser,
  clearOfflineStore,
  readOfflineAuthUser,
} from "@/lib/offline/offline-session";
import { clearDedupeCache } from "@/lib/request-dedupe";
import {
  clearStoredAuthToken,
  fetchAuthSessionResult,
  getStoredAuthToken,
  signInWithDevMobileSession,
  signInWithEmail,
  signOutOnServer,
  signUpWithEmail,
  type AuthUser,
} from "@/lib/auth-session";
import {
  getDevAutoSignInCredentials,
  isDevAutoSignInEnabled,
} from "@/lib/dev-auto-sign-in";
import { isDevMobileSessionEnabled } from "@/lib/dev-mobile-session";

type AuthStatus = "loading" | "signed-out" | "signed-in";

export type DevAutoSignInIssue =
  | "missing-password"
  | "dev-session-failed"
  | "failed"
  | null;

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

  const tryDevEmailAutoSignIn = useCallback(
    async (devSessionFailed: boolean): Promise<AuthUser | null> => {
      if (!isDevAutoSignInEnabled()) {
        if (devSessionFailed) {
          setDevAutoSignInIssue("dev-session-failed");
        } else {
          setDevAutoSignInIssue(null);
        }
        return null;
      }

      const credentials = getDevAutoSignInCredentials();
      if (!credentials) {
        if (devSessionFailed) {
          setDevAutoSignInIssue("dev-session-failed");
        } else {
          setDevAutoSignInIssue("missing-password");
        }
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
        setDevAutoSignInIssue(devSessionFailed ? "dev-session-failed" : "failed");
        return null;
      }
    },
    [],
  );

  const tryDevSilentSignIn = useCallback(async (): Promise<AuthUser | null> => {
    let devSessionFailed = false;

    if (isDevMobileSessionEnabled()) {
      try {
        const signedInUser = await signInWithDevMobileSession();
        setDevAutoSignInIssue(null);
        return signedInUser;
      } catch {
        devSessionFailed = true;
      }
    }

    return tryDevEmailAutoSignIn(devSessionFailed);
  }, [tryDevEmailAutoSignIn]);

  const devSilentSignInAvailable =
    isDevAutoSignInEnabled() || isDevMobileSessionEnabled();

  const handleSignedOut = useCallback(async () => {
    clearAppDataCaches();
    setUser(null);

    if (devSilentSignInAvailable) {
      setStatus("loading");
      const devUser = await tryDevSilentSignIn();
      if (devUser) {
        await bindOfflineStoreToUser(devUser);
        setUser(devUser);
        setStatus("signed-in");
        return;
      }
    }

    setStatus("signed-out");
  }, [devSilentSignInAvailable, tryDevSilentSignIn]);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    try {
      const token = await getStoredAuthToken();
      if (!token) {
        const devUser = await tryDevSilentSignIn();
        if (devUser) {
          clearAppDataCaches();
          await bindOfflineStoreToUser(devUser);
          setUser(devUser);
          setStatus("signed-in");
          return;
        }
        setUser(null);
        setStatus("signed-out");
        return;
      }

      const session = await fetchAuthSessionResult(token);
      if (session.status === "unreachable") {
        const offlineUser = await readOfflineAuthUser();
        if (offlineUser) {
          setUser(offlineUser);
          setStatus("signed-in");
          return;
        }
      }

      const sessionUser = session.status === "ok" ? session.user : null;
      if (!sessionUser) {
        await clearStoredAuthToken();
        const devUser = await tryDevSilentSignIn();
        if (devUser) {
          clearAppDataCaches();
          await bindOfflineStoreToUser(devUser);
          setUser(devUser);
          setStatus("signed-in");
          return;
        }
        setUser(null);
        setStatus("signed-out");
        return;
      }

      await bindOfflineStoreToUser(sessionUser);
      setUser(sessionUser);
      setStatus("signed-in");
    } catch {
      await clearStoredAuthToken();
      setUser(null);
      setStatus("signed-out");
    }
  }, [tryDevSilentSignIn]);

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
    await bindOfflineStoreToUser(signedInUser);
    setUser(signedInUser);
    setStatus("signed-in");
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      const signedInUser = await signUpWithEmail(input);
      clearAppDataCaches();
      await bindOfflineStoreToUser(signedInUser);
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
    await bindOfflineStoreToUser(signedInUser);
    setUser(signedInUser);
    setStatus("signed-in");
  }, []);

  const signOut = useCallback(async () => {
    await clearOfflineStore();
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
