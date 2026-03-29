import type { JournalEntry, PostingLine, YYYYMM } from "../models/accounting";

interface BalanceRow {
  accountId: string;
  accountName: string;
  accountKind: "asset" | "liability";
  amount: number;
}

const OPENING_BALANCE_CATEGORY_ID = "sys-opening-balance";
const OPENING_BALANCE_CATEGORY_NAME = "前月繰越";
const OPENING_BALANCE_EQUITY_ACCOUNT_ID = "eq-opening-balance";
const OPENING_BALANCE_EQUITY_ACCOUNT_NAME = "元入金";

function toMonthStartDate(monthKey: YYYYMM): string {
  const year = monthKey.slice(0, 4);
  const month = monthKey.slice(4, 6);
  return `${year}-${month}-01`;
}

function addAssetDelta(
  map: Map<string, BalanceRow>,
  posting: PostingLine,
  delta: number,
) {
  const key = `asset:${posting.accountId}`;
  const existing = map.get(key);

  if (!existing) {
    map.set(key, {
      accountId: posting.accountId,
      accountName: posting.accountName,
      accountKind: "asset",
      amount: delta,
    });
    return;
  }

  existing.amount += delta;
}

function addLiabilityDelta(
  map: Map<string, BalanceRow>,
  posting: PostingLine,
  delta: number,
) {
  const key = `liability:${posting.accountId}`;
  const existing = map.get(key);

  if (!existing) {
    map.set(key, {
      accountId: posting.accountId,
      accountName: posting.accountName,
      accountKind: "liability",
      amount: delta,
    });
    return;
  }

  existing.amount += delta;
}

export function calculateCarryForwardBalances(
  entries: JournalEntry[],
): BalanceRow[] {
  const map = new Map<string, BalanceRow>();

  for (const entry of entries) {
    if (entry.debit.accountKind === "asset") {
      addAssetDelta(map, entry.debit, entry.debit.amount);
    }
    if (entry.debit.accountKind === "liability") {
      addLiabilityDelta(map, entry.debit, -entry.debit.amount);
    }

    if (entry.credit.accountKind === "asset") {
      addAssetDelta(map, entry.credit, -entry.credit.amount);
    }
    if (entry.credit.accountKind === "liability") {
      addLiabilityDelta(map, entry.credit, entry.credit.amount);
    }
  }

  return [...map.values()]
    .filter((row) => Math.trunc(row.amount) !== 0)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

export function buildOpeningBalanceEntries(
  userId: string,
  monthKey: YYYYMM,
  balances: BalanceRow[],
): JournalEntry[] {
  const occurredOn = toMonthStartDate(monthKey);
  const now = Date.now();

  return balances.map((balance) => {
    const amount = Math.trunc(Math.abs(balance.amount));

    const equityPosting: PostingLine = {
      accountId: OPENING_BALANCE_EQUITY_ACCOUNT_ID,
      accountName: OPENING_BALANCE_EQUITY_ACCOUNT_NAME,
      accountKind: "equity",
      amount,
    };

    let debit: PostingLine;
    let credit: PostingLine;

    if (balance.accountKind === "asset") {
      if (balance.amount > 0) {
        debit = {
          accountId: balance.accountId,
          accountName: balance.accountName,
          accountKind: "asset",
          amount,
        };
        credit = equityPosting;
      } else {
        debit = equityPosting;
        credit = {
          accountId: balance.accountId,
          accountName: balance.accountName,
          accountKind: "asset",
          amount,
        };
      }
    } else if (balance.amount > 0) {
      debit = equityPosting;
      credit = {
        accountId: balance.accountId,
        accountName: balance.accountName,
        accountKind: "liability",
        amount,
      };
    } else {
      debit = {
        accountId: balance.accountId,
        accountName: balance.accountName,
        accountKind: "liability",
        amount,
      };
      credit = equityPosting;
    }

    return {
      id: crypto.randomUUID(),
      userId,
      monthKey,
      occurredOn,
      description: "前月残高の繰越",
      currency: "JPY",
      debit,
      credit,
      inputCategoryId: OPENING_BALANCE_CATEGORY_ID,
      inputCategoryName: OPENING_BALANCE_CATEGORY_NAME,
      paymentSourceAccountId: balance.accountId,
      paymentSourceAccountName: balance.accountName,
      isTransferLike: true,
      isSystemGenerated: true,
      systemType: "opening-balance",
      createdAt: now,
      updatedAt: now,
    };
  });
}
