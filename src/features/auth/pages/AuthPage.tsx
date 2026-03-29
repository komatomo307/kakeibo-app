import { useAuth } from "../../../state/AuthContext";

export function AuthPage() {
  const {
    loading,
    authBusy,
    authErrorMessage,
    signInWithGoogleAccount,
    signInAsGuest,
  } = useAuth();

  return (
    <section className="mx-auto mt-10 max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">
        ログインして家計簿を始める
      </h1>
      <p className="text-sm text-slate-500">
        Googleアカウントでログインすると、端末を変えても同じデータを利用できます。
      </p>
      <button
        type="button"
        onClick={() => void signInWithGoogleAccount()}
        disabled={loading || authBusy}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Googleでログイン
      </button>
      <button
        type="button"
        onClick={() => void signInAsGuest()}
        disabled
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        ゲストで続ける（一時停止中）
      </button>
      <p className="text-xs text-slate-400">
        状態: {loading ? "認証初期化中" : authBusy ? "認証処理中" : "待機中"}
      </p>
      {authErrorMessage ? (
        <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          {authErrorMessage}
        </p>
      ) : null}
    </section>
  );
}
