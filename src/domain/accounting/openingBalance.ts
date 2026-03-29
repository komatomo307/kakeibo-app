import type { JournalEntry } from "../models/accounting";

export type AccountBalanceSnapshot = Record<string, number>;

export function toSnapshotKey(
  accountKind: "asset" | "liability",
  accountId: string,
): string {
  return `${accountKind}:${accountId}`;
}

export function fromSnapshotKey(key: string): {
  accountKind: "asset" | "liability";
  accountId: string;
} | null {
  const [accountKind, accountId] = key.split(":");
  if ((accountKind !== "asset" && accountKind !== "liability") || !accountId) {
    return null;
  }

  return {
    accountKind,
    accountId,
  };
}

export function normalizeBalanceSnapshot(
  snapshot: AccountBalanceSnapshot,
): AccountBalanceSnapshot {
  const normalized: AccountBalanceSnapshot = {};

  for (const [key, value] of Object.entries(snapshot)) {
    const amount = Math.trunc(value);
    if (amount !== 0) {
      normalized[key] = amount;
    }
  }

  return normalized;
}

export function calculateEntriesBalanceDelta(
  entries: JournalEntry[],
): AccountBalanceSnapshot {
  const delta: AccountBalanceSnapshot = {};

  for (const entry of entries) {
    if (entry.debit.accountKind === "asset") {
      const key = toSnapshotKey("asset", entry.debit.accountId);
      delta[key] = (delta[key] ?? 0) + entry.debit.amount;
    }
    if (entry.debit.accountKind === "liability") {
      const key = toSnapshotKey("liability", entry.debit.accountId);
      delta[key] = (delta[key] ?? 0) - entry.debit.amount;
    }

    if (entry.credit.accountKind === "asset") {
      const key = toSnapshotKey("asset", entry.credit.accountId);
      delta[key] = (delta[key] ?? 0) - entry.credit.amount;
    }
    if (entry.credit.accountKind === "liability") {
      const key = toSnapshotKey("liability", entry.credit.accountId);
      delta[key] = (delta[key] ?? 0) + entry.credit.amount;
    }
  }

  return normalizeBalanceSnapshot(delta);
}

export function mergeBalanceSnapshots(
  base: AccountBalanceSnapshot,
  delta: AccountBalanceSnapshot,
): AccountBalanceSnapshot {
  const merged: AccountBalanceSnapshot = { ...base };

  for (const [key, value] of Object.entries(delta)) {
    merged[key] = (merged[key] ?? 0) + value;
  }

  return normalizeBalanceSnapshot(merged);
}
