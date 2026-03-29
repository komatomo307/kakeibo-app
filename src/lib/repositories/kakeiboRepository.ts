import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import {
  calculateEntriesBalanceDelta,
  mergeBalanceSnapshots,
  normalizeBalanceSnapshot,
  type AccountBalanceSnapshot,
} from "../../domain/accounting/openingBalance";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
  type JournalEntry,
  type MonthlyTransactionsMeta,
  type UserSettings,
  type YYYYMM,
} from "../../domain/models/accounting";
import { firestore } from "../firebase/config";

function settingsDocRef(userId: string) {
  return doc(firestore, "users", userId, "settings", "default");
}

function monthlyDocRef(userId: string, monthKey: YYYYMM) {
  return doc(firestore, "users", userId, "monthly_transactions", monthKey);
}

function entriesCollectionRef(userId: string, monthKey: YYYYMM) {
  return collection(
    firestore,
    "users",
    userId,
    "monthly_transactions",
    monthKey,
    "entries",
  );
}

function entryDocRef(userId: string, monthKey: YYYYMM, entryId: string) {
  return doc(
    firestore,
    "users",
    userId,
    "monthly_transactions",
    monthKey,
    "entries",
    entryId,
  );
}

function createDefaultSettings(userId: string): UserSettings {
  return {
    userId,
    timezone: "Asia/Tokyo",
    locale: "ja-JP",
    currency: "JPY",
    categories: DEFAULT_CATEGORIES,
    paymentSources: DEFAULT_PAYMENT_SOURCES,
    updatedAt: Date.now(),
  };
}

export async function ensureUserSettings(
  userId: string,
): Promise<UserSettings> {
  const settingsRef = settingsDocRef(userId);
  const snapshot = await getDoc(settingsRef);

  if (snapshot.exists()) {
    const existing = snapshot.data() as UserSettings;
    const hasIncomeCategory = existing.categories.some(
      (category) => category.kind === "income",
    );
    const hasAccountTransferCategory = existing.categories.some(
      (category) =>
        category.id === "cat-account-transfer" ||
        (category.kind === "transfer" && category.name === "口座振替"),
    );

    if (hasIncomeCategory && hasAccountTransferCategory) {
      return existing;
    }

    const salaryDefault = DEFAULT_CATEGORIES.find(
      (category) => category.kind === "income",
    );
    const accountTransferDefault = DEFAULT_CATEGORIES.find(
      (category) => category.id === "cat-account-transfer",
    );

    if ((!hasIncomeCategory && !salaryDefault) || !accountTransferDefault) {
      return existing;
    }

    const defaultsToAdd = [
      ...(hasIncomeCategory || !salaryDefault ? [] : [salaryDefault]),
      ...(hasAccountTransferCategory ? [] : [accountTransferDefault]),
    ];

    const migrated: UserSettings = {
      ...existing,
      categories: [...existing.categories, ...defaultsToAdd].map(
        (item, index) => ({
          ...item,
          order: index,
        }),
      ),
      updatedAt: Date.now(),
    };

    await setDoc(settingsRef, migrated, { merge: true });
    return migrated;
  }

  const defaults = createDefaultSettings(userId);
  await setDoc(settingsRef, defaults);
  return defaults;
}

export async function saveUserSettings(
  userId: string,
  settings: UserSettings,
): Promise<void> {
  await setDoc(settingsDocRef(userId), { ...settings, updatedAt: Date.now() });
}

export async function fetchMonthlyEntries(
  userId: string,
  monthKey: YYYYMM,
): Promise<JournalEntry[]> {
  const q = query(
    entriesCollectionRef(userId, monthKey),
    orderBy("occurredOn", "desc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => {
    const data = item.data() as JournalEntry;
    return {
      ...data,
      id: data.id ?? item.id,
      monthKey,
      userId,
    };
  });
}

export async function ensureMonthlyOpeningSnapshot(
  userId: string,
  monthKey: YYYYMM,
): Promise<AccountBalanceSnapshot> {
  const currentMetaSnapshot = await getDoc(monthlyDocRef(userId, monthKey));
  const currentMeta = currentMetaSnapshot.exists()
    ? (currentMetaSnapshot.data() as MonthlyTransactionsMeta)
    : null;

  if (currentMeta?.balancesSnapshot) {
    return normalizeBalanceSnapshot(currentMeta.balancesSnapshot);
  }

  const previousMonthKey = dayjs(`${monthKey}01`)
    .subtract(1, "month")
    .format("YYYYMM");

  const previousMonthMetaSnapshot = await getDoc(
    monthlyDocRef(userId, previousMonthKey),
  );
  const previousMonthMeta = previousMonthMetaSnapshot.exists()
    ? (previousMonthMetaSnapshot.data() as MonthlyTransactionsMeta)
    : null;
  const previousOpeningSnapshot = normalizeBalanceSnapshot(
    previousMonthMeta?.balancesSnapshot ?? {},
  );

  const previousMonthEntries = await fetchMonthlyEntries(
    userId,
    previousMonthKey,
  );
  const entriesForDelta = previousMonthMeta?.balancesSnapshot
    ? previousMonthEntries.filter(
        (entry) => entry.systemType !== "opening-balance",
      )
    : previousMonthEntries;
  const previousMonthDelta = calculateEntriesBalanceDelta(entriesForDelta);
  const currentOpeningSnapshot = mergeBalanceSnapshots(
    previousOpeningSnapshot,
    previousMonthDelta,
  );

  await setDoc(
    monthlyDocRef(userId, monthKey),
    {
      monthKey,
      userId,
      balancesSnapshot: currentOpeningSnapshot,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return currentOpeningSnapshot;
}

export async function upsertJournalEntry(
  userId: string,
  entry: JournalEntry,
): Promise<void> {
  await setDoc(entryDocRef(userId, entry.monthKey, entry.id), entry, {
    merge: true,
  });
  await setDoc(
    monthlyDocRef(userId, entry.monthKey),
    {
      monthKey: entry.monthKey,
      userId,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function updateJournalEntry(
  userId: string,
  previousEntry: JournalEntry,
  nextEntry: JournalEntry,
): Promise<void> {
  await setDoc(
    entryDocRef(userId, nextEntry.monthKey, nextEntry.id),
    nextEntry,
    {
      merge: true,
    },
  );

  if (previousEntry.monthKey !== nextEntry.monthKey) {
    await deleteDoc(
      entryDocRef(userId, previousEntry.monthKey, previousEntry.id),
    );
  }

  await setDoc(
    monthlyDocRef(userId, nextEntry.monthKey),
    {
      monthKey: nextEntry.monthKey,
      userId,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (previousEntry.monthKey !== nextEntry.monthKey) {
    await setDoc(
      monthlyDocRef(userId, previousEntry.monthKey),
      {
        monthKey: previousEntry.monthKey,
        userId,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}

export async function deleteJournalEntry(
  userId: string,
  monthKey: YYYYMM,
  entryId: string,
): Promise<void> {
  await deleteDoc(entryDocRef(userId, monthKey, entryId));
  await setDoc(
    monthlyDocRef(userId, monthKey),
    {
      monthKey,
      userId,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
