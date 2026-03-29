import { useAuth } from "../../../state/AuthContext";

export function AuthPage() {
  const { loading } = useAuth();

  return (
    <section className="mx-auto mt-10 max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">家計簿をはじめる</h1>
      <p className="text-sm text-slate-500">
        認証は自動で処理されます。しばらく待つとホーム画面へ進みます。
      </p>
      <p className="text-xs text-slate-400">
        状態: {loading ? "初期化中" : "準備完了"}
      </p>
    </section>
  );
}
