import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  // signInAnonymously,
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
  signOutCurrentUser: () => Promise<void>;
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
    // 匿名認証は一時停止中。再開時は signInAnonymously の import と呼び出しを戻す。
    setAuthErrorMessage(
      "現在ゲスト利用は停止中です。Googleでログインしてください。",
    );
  };

  const signOutCurrentUser = async () => {
    setAuthBusy(true);
    setAuthErrorMessage(null);

    try {
      await signOut(firebaseAuth);
    } catch {
      setAuthErrorMessage(
        "ログアウトに失敗しました。時間をおいて再度お試しください。",
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
      signOutCurrentUser,
    }),
    [
      user,
      loading,
      authBusy,
      authErrorMessage,
      signInWithGoogleAccount,
      signInAsGuest,
      signOutCurrentUser,
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
