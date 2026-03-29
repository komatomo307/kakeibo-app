import dayjs from "dayjs";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { buildJournalEntry } from "../../../domain/accounting/autoJournal";
import { useAppState } from "../../../state/AppContext";

export type TransactionMode = "expense" | "income";

interface TransactionFormProps {
  mode: TransactionMode;
}

export function TransactionForm({ mode }: TransactionFormProps) {
  const { state, addEntry, syncing } = useAppState();

  if (!state.settings) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
        設定データを読み込んでいます...
      </p>
    );
  }

  const settings = state.settings;

  const [occurredOn, setOccurredOn] = useState(dayjs().format("YYYY-MM-DD"));
  const [categoryId, setCategoryId] = useState(
    settings.categories[0]?.id ?? "",
  );
  const [paymentSourceAccountId, setPaymentSourceAccountId] = useState(
    settings.paymentSources[0]?.id ?? "",
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const availableCategories = useMemo(
    () =>
      settings.categories.filter((category) =>
        mode === "income"
          ? category.kind === "income"
          : category.kind === "expense" || category.kind === "transfer",
      ),
    [settings.categories, mode],
  );

  useEffect(() => {
    if (!availableCategories.find((item) => item.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? "");
    }
  }, [availableCategories, categoryId]);

  useEffect(() => {
    if (
      !settings.paymentSources.find(
        (item) => item.id === paymentSourceAccountId,
      )
    ) {
      setPaymentSourceAccountId(settings.paymentSources[0]?.id ?? "");
    }
  }, [settings.paymentSources, paymentSourceAccountId]);

  const canSubmit = useMemo(
    () =>
      Number(amount) > 0 &&
      categoryId.length > 0 &&
      paymentSourceAccountId.length > 0 &&
      availableCategories.length > 0 &&
      settings.paymentSources.length > 0,
    [amount, categoryId, paymentSourceAccountId, availableCategories, settings],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const journalEntry = buildJournalEntry({
      userId: state.userId,
      draft: {
        occurredOn,
        categoryId,
        paymentSourceAccountId,
        amount: Number(amount),
        description,
      },
      categories: settings.categories,
      paymentSources: settings.paymentSources,
    });

    await addEntry(journalEntry);
    setAmount("");
    setDescription("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-4 shadow-sm"
    >
      {availableCategories.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {mode === "income"
            ? "収入カテゴリがありません。設定画面で収入カテゴリを追加してください。"
            : "支出カテゴリがありません。設定画面で支出カテゴリを追加してください。"}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          日付
        </label>
        <input
          type="date"
          value={occurredOn}
          onChange={(event) => setOccurredOn(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          カテゴリ
        </label>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
        >
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          {mode === "income" ? "入金先" : "支払元"}
        </label>
        <select
          value={paymentSourceAccountId}
          onChange={(event) => setPaymentSourceAccountId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
        >
          {settings.paymentSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          摘要
        </label>
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="メモを入力"
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          金額（円）
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="1000"
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-lg font-semibold"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || syncing}
        className="w-full rounded-xl bg-teal-600 px-4 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {syncing ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
