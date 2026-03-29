import * as XLSX from "xlsx";
import type { JournalEntry } from "../../domain/models/accounting";

function toJpy(value: number): number {
  return Math.trunc(value);
}

export function createMonthlyWorkbook(
  monthKey: string,
  entries: JournalEntry[],
): XLSX.WorkBook {
  const categorySummary = new Map<string, { kind: string; total: number }>();

  for (const entry of entries) {
    const current = categorySummary.get(entry.inputCategoryName) ?? {
      kind: entry.debit.accountKind,
      total: 0,
    };
    categorySummary.set(entry.inputCategoryName, {
      kind: current.kind,
      total: current.total + toJpy(entry.debit.amount),
    });
  }

  const summaryRows = [...categorySummary.entries()].map(
    ([category, data]) => ({
      月: monthKey,
      区分: data.kind,
      カテゴリ: category,
      合計金額: data.total,
    }),
  );

  const detailsRows = entries
    .slice()
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))
    .map((entry) => ({
      日付: entry.occurredOn,
      カテゴリ: entry.inputCategoryName,
      区分: entry.debit.accountKind,
      借方勘定: entry.debit.accountName,
      貸方勘定: entry.credit.accountName,
      支払元: entry.paymentSourceAccountName,
      金額: toJpy(entry.debit.amount),
      摘要: entry.description ?? "",
    }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      summaryRows.length > 0
        ? summaryRows
        : [{ 月: monthKey, 区分: "-", カテゴリ: "-", 合計金額: 0 }],
    ),
    "カテゴリ別月間収支",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      detailsRows.length > 0
        ? detailsRows
        : [
            {
              日付: "-",
              カテゴリ: "-",
              区分: "-",
              借方勘定: "-",
              貸方勘定: "-",
              支払元: "-",
              金額: 0,
              摘要: "",
            },
          ],
    ),
    "日別トランザクション",
  );

  return workbook;
}

export function downloadMonthlyWorkbook(
  monthKey: string,
  entries: JournalEntry[],
): void {
  const workbook = createMonthlyWorkbook(monthKey, entries);
  XLSX.writeFile(workbook, `kakeibo-${monthKey}.xlsx`);
}
