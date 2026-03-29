import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import {
  fromSnapshotKey,
  toSnapshotKey,
} from "../../../domain/accounting/openingBalance";
import { useAppState } from "../../../state/AppContext";

const CHART_COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#99f6e4", "#5eead4"];

export function DashboardPage() {
  const { state, monthEntries, loading, errorMessage } = useAppState();
  const [bsFilterAccount, setBsFilterAccount] = useState<string>("all");

  useEffect(() => {
    setBsFilterAccount("all");
  }, [state.selectedMonthKey]);

  if (loading) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
        集計データを読み込んでいます...
      </p>
    );
  }

  const categoryKindMap = new Map<string, "expense" | "income" | "transfer">();
  for (const category of state.settings?.categories ?? []) {
    categoryKindMap.set(category.id, category.kind);
  }

  const totalExpense = monthEntries
    .filter((entry) => categoryKindMap.get(entry.inputCategoryId) === "expense")
    .reduce((sum, entry) => sum + entry.debit.amount, 0);

  const totalIncome = monthEntries
    .filter((entry) => categoryKindMap.get(entry.inputCategoryId) === "income")
    .reduce((sum, entry) => sum + entry.debit.amount, 0);

  const netChange = totalIncome - totalExpense;

  const byCategoryMap = new Map<string, number>();
  for (const entry of monthEntries) {
    if (categoryKindMap.get(entry.inputCategoryId) !== "expense") {
      continue;
    }

    const current = byCategoryMap.get(entry.inputCategoryName) ?? 0;
    byCategoryMap.set(entry.inputCategoryName, current + entry.debit.amount);
  }

  const pieData = [...byCategoryMap.entries()].map(([name, value]) => ({
    name,
    value,
  }));

  const balanceMap = new Map<string, number>();
  for (const entry of monthEntries) {
    if (entry.debit.accountKind === "asset") {
      const current = balanceMap.get(entry.debit.accountName) ?? 0;
      balanceMap.set(entry.debit.accountName, current + entry.debit.amount);
    }
    if (entry.debit.accountKind === "liability") {
      const current = balanceMap.get(entry.debit.accountName) ?? 0;
      balanceMap.set(entry.debit.accountName, current - entry.debit.amount);
    }
    if (entry.credit.accountKind === "asset") {
      const current = balanceMap.get(entry.credit.accountName) ?? 0;
      balanceMap.set(entry.credit.accountName, current - entry.credit.amount);
    }
    if (entry.credit.accountKind === "liability") {
      const current = balanceMap.get(entry.credit.accountName) ?? 0;
      balanceMap.set(entry.credit.accountName, current + entry.credit.amount);
    }
  }

  const balanceRows = [...balanceMap.entries()].map(
    ([accountName, amount]) => ({
      accountName,
      amount,
    }),
  );

  const journalRows = monthEntries
    .slice()
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

  const accountNameById = new Map<string, string>();
  for (const source of state.settings?.paymentSources ?? []) {
    accountNameById.set(source.id, source.name);
  }
  for (const row of journalRows) {
    accountNameById.set(row.debit.accountId, row.debit.accountName);
    accountNameById.set(row.credit.accountId, row.credit.accountName);
  }

  const openingBalanceRows = Object.entries(state.openingBalancesSnapshot)
    .map(([key, amount]) => {
      const parsed = fromSnapshotKey(key);
      if (!parsed) {
        return null;
      }

      const accountName =
        accountNameById.get(parsed.accountId) ?? parsed.accountId;

      return {
        snapshotKey: key,
        accountId: parsed.accountId,
        accountKind: parsed.accountKind,
        accountName,
        amount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));

  const totalOpeningAssets = openingBalanceRows
    .filter((row) => row.accountKind === "asset")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalOpeningLiabilities = openingBalanceRows
    .filter((row) => row.accountKind === "liability")
    .reduce((sum, row) => sum + Math.max(row.amount, 0), 0);

  const names = new Set<string>();
  for (const source of state.settings?.paymentSources ?? []) {
    names.add(source.name);
  }
  for (const row of openingBalanceRows) {
    names.add(row.accountName);
  }
  for (const row of journalRows) {
    names.add(row.debit.accountName);
    names.add(row.credit.accountName);
  }
  const bsFilterOptions = ["all", ...Array.from(names)];

  const filteredJournalRows =
    bsFilterAccount === "all"
      ? journalRows
      : journalRows.filter(
          (entry) =>
            entry.debit.accountName === bsFilterAccount ||
            entry.credit.accountName === bsFilterAccount ||
            entry.paymentSourceAccountName === bsFilterAccount,
        );

  const bsBalanceMap = new Map<string, number>();
  for (const row of openingBalanceRows) {
    if (bsFilterAccount !== "all" && row.accountName !== bsFilterAccount) {
      continue;
    }
    bsBalanceMap.set(row.snapshotKey, row.amount);
  }

  for (const entry of filteredJournalRows) {
    if (entry.debit.accountKind === "asset") {
      const key = toSnapshotKey("asset", entry.debit.accountId);
      const current = bsBalanceMap.get(key) ?? 0;
      bsBalanceMap.set(key, current + entry.debit.amount);
    }
    if (entry.debit.accountKind === "liability") {
      const key = toSnapshotKey("liability", entry.debit.accountId);
      const current = bsBalanceMap.get(key) ?? 0;
      bsBalanceMap.set(key, current - entry.debit.amount);
    }
    if (entry.credit.accountKind === "asset") {
      const key = toSnapshotKey("asset", entry.credit.accountId);
      const current = bsBalanceMap.get(key) ?? 0;
      bsBalanceMap.set(key, current - entry.credit.amount);
    }
    if (entry.credit.accountKind === "liability") {
      const key = toSnapshotKey("liability", entry.credit.accountId);
      const current = bsBalanceMap.get(key) ?? 0;
      bsBalanceMap.set(key, current + entry.credit.amount);
    }
  }

  const bsBalanceRows = [...bsBalanceMap.entries()]
    .map(([snapshotKey, amount]) => {
      const parsed = fromSnapshotKey(snapshotKey);
      if (!parsed) {
        return null;
      }

      return {
        accountId: parsed.accountId,
        accountName: accountNameById.get(parsed.accountId) ?? parsed.accountId,
        accountKind: parsed.accountKind,
        amount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const bsAssetRows = bsBalanceRows
    .filter((row) => row.accountKind === "asset")
    .map((row) => ({ ...row, amount: row.amount }));

  const bsLiabilityRows = bsBalanceRows
    .filter((row) => row.accountKind === "liability")
    .map((row) => ({ ...row, amount: Math.max(row.amount, 0) }));

  const bsTotalAssets = bsAssetRows.reduce((sum, row) => sum + row.amount, 0);
  const bsTotalLiabilities = bsLiabilityRows.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const bsNetAssets = bsTotalAssets - bsTotalLiabilities;

  const totalDebit = filteredJournalRows.reduce(
    (sum, row) => sum + row.debit.amount,
    0,
  );
  const totalCredit = filteredJournalRows.reduce(
    (sum, row) => sum + row.credit.amount,
    0,
  );

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500">当月の収支サマリー</p>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">収入合計</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {totalIncome.toLocaleString()}円
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">支出合計</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {totalExpense.toLocaleString()}円
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">収支増減</p>
          <p
            className={`mt-2 text-lg font-bold ${
              netChange >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {netChange.toLocaleString()}円
          </p>
        </article>
      </div>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">カテゴリ別支出</h2>
        <div className="mt-3 h-56">
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-500">データがありません。</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  outerRadius={80}
                >
                  {pieData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">月初繰越残高</h2>
        {openingBalanceRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            前月からの繰越はありません。
          </p>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">繰越資産</p>
                <p className="mt-1 text-base font-bold text-emerald-800">
                  {totalOpeningAssets.toLocaleString()}円
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-rose-700">繰越負債</p>
                <p className="mt-1 text-base font-bold text-rose-800">
                  {totalOpeningLiabilities.toLocaleString()}円
                </p>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {openingBalanceRows.map((row) => (
                <li
                  key={`opening-${row.snapshotKey}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">
                    {row.accountName}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      row.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {row.amount.toLocaleString()}円
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          資産・負債の増減
        </h2>
        <ul className="mt-2 space-y-2">
          {balanceRows.length === 0 ? (
            <li className="text-sm text-slate-500">データがありません。</li>
          ) : (
            balanceRows.map((row) => (
              <li
                key={row.accountName}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  {row.accountName}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    row.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {row.amount.toLocaleString()}円
                </span>
              </li>
            ))
          )}
        </ul>
      </article>

      <article className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">貸借対照表</h2>

        <div className="mt-2 flex flex-wrap gap-2">
          {bsFilterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setBsFilterAccount(option)}
              className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                bsFilterAccount === option
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {option === "all" ? "全て" : `${option}のみ`}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">資産合計</p>
            <p className="mt-1 text-lg font-bold text-emerald-800">
              {bsTotalAssets.toLocaleString()}円
            </p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-xs text-rose-700">負債合計</p>
            <p className="mt-1 text-lg font-bold text-rose-800">
              {bsTotalLiabilities.toLocaleString()}円
            </p>
          </div>
        </div>

        <p
          className={`mt-3 text-sm font-semibold ${
            bsNetAssets >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          純資産: {bsNetAssets.toLocaleString()}円
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">
              資産内訳
            </p>
            <ul className="space-y-1">
              {bsAssetRows.length === 0 ? (
                <li className="text-xs text-slate-500">データなし</li>
              ) : (
                bsAssetRows.map((row) => (
                  <li
                    key={`asset-${row.accountName}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                  >
                    <span className="text-xs text-slate-700">
                      {row.accountName}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {row.amount.toLocaleString()}円
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">
              負債内訳
            </p>
            <ul className="space-y-1">
              {bsLiabilityRows.length === 0 ? (
                <li className="text-xs text-slate-500">データなし</li>
              ) : (
                bsLiabilityRows.map((row) => (
                  <li
                    key={`liability-${row.accountName}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                  >
                    <span className="text-xs text-slate-700">
                      {row.accountName}
                    </span>
                    <span className="text-xs font-semibold text-rose-700">
                      {row.amount.toLocaleString()}円
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">
            仕訳一覧（縦表示）
          </p>
          <ul className="space-y-2">
            {filteredJournalRows.length === 0 ? (
              <li className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                データなし
              </li>
            ) : (
              filteredJournalRows.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{entry.occurredOn}</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    借方: {entry.debit.accountName} :{" "}
                    {entry.debit.amount.toLocaleString()}円
                  </p>
                  <p className="mt-1 text-xs text-rose-700">
                    貸方: {entry.credit.accountName} :{" "}
                    {entry.credit.amount.toLocaleString()}円
                  </p>
                </li>
              ))
            )}
          </ul>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
            <p className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">
              借方合計: {totalDebit.toLocaleString()}円
            </p>
            <p className="rounded-lg bg-rose-50 px-2 py-2 text-rose-700">
              貸方合計: {totalCredit.toLocaleString()}円
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
