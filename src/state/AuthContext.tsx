import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { firebaseAuth } from "../lib/firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authBusy: boolean;
  authErrorMessage: string | null;
  signInWithGoogleAccount: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void getRedirectResult(firebaseAuth).catch(() => {
      setAuthErrorMessage(
        "Googleログインの結果取得に失敗しました。再度お試しください。",
      );
    });
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      if (!active) {
        return;
      }

      if (nextUser) {
        setUser(nextUser);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogleAccount = async () => {
    setAuthBusy(true);
    setAuthErrorMessage(null);

    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(firebaseAuth, provider);
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        typeof error.code === "string" &&
        [
          "auth/popup-blocked",
          "auth/popup-closed-by-user",
          "auth/operation-not-supported-in-this-environment",
        ].includes(error.code)
      ) {
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }

      setAuthErrorMessage(
        "Googleログインに失敗しました。Firebaseの認証設定を確認してください。",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const signInAsGuest = async () => {
    setAuthBusy(true);
    setAuthErrorMessage(null);

    try {
      await signInAnonymously(firebaseAuth);
    } catch {
      setAuthErrorMessage(
        "ゲストログインに失敗しました。匿名認証の有効化を確認してください。",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authBusy,
      authErrorMessage,
      signInWithGoogleAccount,
      signInAsGuest,
    }),
    [
      user,
      loading,
      authBusy,
      authErrorMessage,
      signInWithGoogleAccount,
      signInAsGuest,
    ],
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
