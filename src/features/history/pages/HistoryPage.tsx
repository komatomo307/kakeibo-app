import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { JournalEntry } from "../../../domain/models/accounting";
import { useAppState } from "../../../state/AppContext";

export function HistoryPage() {
  const {
    monthEntries,
    state,
    loading,
    syncing,
    errorMessage,
    deleteEntry,
    updateEntry,
  } = useAppState();
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const categoryKindMap = useMemo(() => {
    const map = new Map<string, "expense" | "income" | "transfer">();
    for (const category of state.settings?.categories ?? []) {
      map.set(category.id, category.kind);
    }
    return map;
  }, [state.settings]);

  const canSaveEdit = useMemo(
    () => Number(editAmount) > 0 && editDate.length > 0,
    [editAmount, editDate],
  );

  const openEditor = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditDate(entry.occurredOn);
    setEditAmount(String(entry.debit.amount));
    setEditDescription(entry.description ?? "");
  };

  const closeEditor = () => {
    setEditingEntry(null);
    setEditDate("");
    setEditAmount("");
    setEditDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !canSaveEdit) {
      return;
    }

    const nextAmount = Math.trunc(Math.abs(Number(editAmount)));
    const nextEntry: JournalEntry = {
      ...editingEntry,
      occurredOn: editDate,
      monthKey: dayjs(editDate).format("YYYYMM"),
      description: editDescription.trim() || undefined,
      debit: {
        ...editingEntry.debit,
        amount: nextAmount,
      },
      credit: {
        ...editingEntry.credit,
        amount: nextAmount,
      },
      updatedAt: Date.now(),
    };

    await updateEntry(editingEntry, nextEntry);
    closeEditor();
  };

  if (loading) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
        履歴を読み込んでいます...
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">履歴</h1>
        <p className="text-sm text-slate-500">
          {state.selectedMonthKey} の入力一覧
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <ul className="space-y-3">
        {monthEntries.length === 0 ? (
          <li className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
            当月データがまだありません。
          </li>
        ) : (
          monthEntries.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-white p-4 shadow-sm">
              {entry.systemType === "opening-balance" ? (
                <p className="mb-2 inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  システム仕訳（期首繰越）
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-semibold ${
                    categoryKindMap.get(entry.inputCategoryId) === "income"
                      ? "text-emerald-700"
                      : categoryKindMap.get(entry.inputCategoryId) === "expense"
                        ? "text-rose-700"
                        : "text-slate-900"
                  }`}
                >
                  {entry.inputCategoryName}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {entry.debit.amount.toLocaleString()}円
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{entry.occurredOn}</p>
              <p className="mt-1 text-xs text-slate-500">
                借方: {entry.debit.accountName} / 貸方:{" "}
                {entry.credit.accountName}
              </p>
              {entry.description ? (
                <p className="mt-1 text-xs text-slate-500">
                  摘要: {entry.description}
                </p>
              ) : null}
              {entry.systemType !== "opening-balance" ? (
                <>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={() => openEditor(entry)}
                    className="mt-3 mr-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={() => void deleteEntry(entry)}
                    className="mt-3 rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    削除
                  </button>
                </>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {editingEntry ? (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-900/30">
          <div className="w-full rounded-t-3xl bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">取引を編集</h2>

            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  日付
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  金額
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editAmount}
                  onChange={(event) => setEditAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  摘要
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!canSaveEdit || syncing}
                onClick={() => void handleSaveEdit()}
                className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {syncing ? "保存中..." : "更新"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
