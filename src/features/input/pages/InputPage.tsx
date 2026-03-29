import { useState } from "react";
import {
  type TransactionMode,
  TransactionForm,
} from "../components/TransactionForm";

export function InputPage() {
  const [mode, setMode] = useState<TransactionMode>("expense");

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">取引入力</h1>
        <p className="text-sm text-slate-500">
          単式の操作で入力し、保存時に複式仕訳へ変換します。
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setMode("expense")}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            mode === "expense"
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setMode("income")}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            mode === "income"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          収入
        </button>
      </div>

      <TransactionForm mode={mode} />
    </section>
  );
}
