import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type {
  PaymentSource,
  UserCategory,
} from "../../../domain/models/accounting";
import { downloadMonthlyWorkbook } from "../../../lib/export/monthlyWorkbook";
import { fetchMonthlyEntries } from "../../../lib/repositories/kakeiboRepository";
import { useAppState } from "../../../state/AppContext";

export function SettingsPage() {
  const { state, monthEntries, saveSettings, syncing, errorMessage } =
    useAppState();
  const settings = state.settings;
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<
    "expense" | "income" | "transfer"
  >("expense");
  const [newPaymentSourceName, setNewPaymentSourceName] = useState("");
  const [newPaymentSourceKind, setNewPaymentSourceKind] = useState<
    "asset" | "liability"
  >("asset");
  const [editingCategories, setEditingCategories] = useState<UserCategory[]>(
    [],
  );
  const [editingPaymentSources, setEditingPaymentSources] = useState<
    PaymentSource[]
  >([]);
  const [exportMonthKey, setExportMonthKey] = useState(
    dayjs().format("YYYYMM"),
  );
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setEditingCategories(settings.categories);
    setEditingPaymentSources(settings.paymentSources);
  }, [settings]);

  const monthInputValue = useMemo(
    () => `${exportMonthKey.slice(0, 4)}-${exportMonthKey.slice(4, 6)}`,
    [exportMonthKey],
  );

  if (!settings) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
        設定データを読み込んでいます...
      </p>
    );
  }

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    setEditingCategories((prev) => [
      ...prev,
      {
        id: `cat-custom-${crypto.randomUUID()}`,
        name,
        kind: newCategoryKind,
        isDefault: false,
        order: prev.length + 1,
      },
    ]);
    setNewCategoryName("");
  };

  const handleAddPaymentSource = () => {
    const name = newPaymentSourceName.trim();
    if (!name) {
      return;
    }

    setEditingPaymentSources((prev) => [
      ...prev,
      {
        id: `acc-custom-${crypto.randomUUID()}`,
        name,
        accountKind: newPaymentSourceKind,
        isDefault: false,
        order: prev.length + 1,
      },
    ]);
    setNewPaymentSourceName("");
  };

  const handleSaveSettings = async () => {
    if (editingCategories.length === 0 || editingPaymentSources.length === 0) {
      return;
    }

    await saveSettings({
      ...settings,
      categories: editingCategories.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
      paymentSources: editingPaymentSources.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
      updatedAt: Date.now(),
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const entries =
        exportMonthKey === state.selectedMonthKey
          ? monthEntries
          : await fetchMonthlyEntries(state.userId, exportMonthKey);
      downloadMonthlyWorkbook(exportMonthKey, entries);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">設定・出力</h1>
        <p className="text-sm text-slate-500">
          カテゴリや支払元のカスタム管理とExcel出力
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          登録済みカテゴリ
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {editingCategories.map((category) => (
            <li key={category.id} className="flex items-center gap-2">
              <input
                type="text"
                value={category.name}
                onChange={(event) =>
                  setEditingCategories((prev) =>
                    prev.map((item) =>
                      item.id === category.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-2 py-1"
              />
              {!category.isDefault ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditingCategories((prev) =>
                      prev.filter((item) => item.id !== category.id),
                    )
                  }
                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  削除
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="カテゴリを追加"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newCategoryKind}
            onChange={(event) =>
              setNewCategoryKind(
                event.target.value as "expense" | "income" | "transfer",
              )
            }
            className="rounded-lg border border-slate-300 px-2 py-2 text-xs"
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
            <option value="transfer">振替</option>
          </select>
          <button
            type="button"
            onClick={handleAddCategory}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </article>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">支払元</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {editingPaymentSources.map((source) => (
            <li key={source.id} className="flex items-center gap-2">
              <input
                type="text"
                value={source.name}
                onChange={(event) =>
                  setEditingPaymentSources((prev) =>
                    prev.map((item) =>
                      item.id === source.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-2 py-1"
              />
              <select
                value={source.accountKind}
                onChange={(event) =>
                  setEditingPaymentSources((prev) =>
                    prev.map((item) =>
                      item.id === source.id
                        ? {
                            ...item,
                            accountKind: event.target.value as
                              | "asset"
                              | "liability",
                          }
                        : item,
                    ),
                  )
                }
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="asset">資産</option>
                <option value="liability">負債</option>
              </select>
              {!source.isDefault ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditingPaymentSources((prev) =>
                      prev.filter((item) => item.id !== source.id),
                    )
                  }
                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  削除
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={newPaymentSourceName}
            onChange={(event) => setNewPaymentSourceName(event.target.value)}
            placeholder="支払元を追加"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newPaymentSourceKind}
            onChange={(event) =>
              setNewPaymentSourceKind(
                event.target.value as "asset" | "liability",
              )
            }
            className="rounded-lg border border-slate-300 px-2 py-2 text-xs"
          >
            <option value="asset">資産</option>
            <option value="liability">負債</option>
          </select>
          <button
            type="button"
            onClick={handleAddPaymentSource}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white"
          >
            追加
          </button>
        </div>
      </article>

      <button
        type="button"
        onClick={() => void handleSaveSettings()}
        disabled={syncing}
        className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {syncing ? "設定を保存中..." : "設定変更を保存"}
      </button>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Excelエクスポート
        </h2>
        <label className="mt-1 block text-xs text-slate-500">対象月</label>
        <input
          type="month"
          value={monthInputValue}
          onChange={(event) =>
            setExportMonthKey(event.target.value.replace("-", ""))
          }
          className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting
            ? "出力中..."
            : `${dayjs(`${exportMonthKey}01`).format("M月")}の帳票をダウンロード`}
        </button>
      </article>
    </section>
  );
}
