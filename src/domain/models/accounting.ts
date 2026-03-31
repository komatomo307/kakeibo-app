export type YYYYMM = string;
export type ISODate = string;
export type CurrencyCode = "JPY";

export type AccountKind =
  | "asset"
  | "liability"
  | "expense"
  | "income"
  | "equity";

export type DefaultCategoryName =
  | "給与"
  | "食費"
  | "生活費"
  | "固定費"
  | "その他"
  | "口座振替"
  | "カード引き落とし";

export interface AccountMaster {
  id: string;
  name: string;
  kind: AccountKind;
  isSystem: boolean;
  order: number;
  archived?: boolean;
}

export interface PostingLine {
  accountId: string;
  accountName: string;
  accountKind: AccountKind;
  amount: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  monthKey: YYYYMM;
  occurredOn: ISODate;
  description?: string;
  currency: CurrencyCode;
  debit: PostingLine;
  credit: PostingLine;
  inputCategoryId: string;
  inputCategoryName: string;
  paymentSourceAccountId: string;
  paymentSourceAccountName: string;
  transferDestinationAccountId?: string;
  transferDestinationAccountName?: string;
  isTransferLike?: boolean;
  isSystemGenerated?: boolean;
  systemType?: "opening-balance" | "subscription";
  createdAt: number;
  updatedAt: number;
}

export interface MonthlyTransactionsMeta {
  monthKey: YYYYMM;
  userId: string;
  totals: {
    income: number;
    expense: number;
  };
  balancesSnapshot?: Record<string, number>;
  entryCount: number;
  updatedAt: number;
}

export interface UserCategory {
  id: string;
  name: string;
  kind: "expense" | "income" | "transfer";
  isDefault: boolean;
  order: number;
  archived?: boolean;
}

export interface PaymentSource {
  id: string;
  name: string;
  accountKind: "asset" | "liability";
  isDefault: boolean;
  order: number;
  archived?: boolean;
}

export interface SubscriptionRule {
  id: string;
  categoryId: string;
  paymentSourceAccountId: string;
  amount: number;
  description?: string;
  startMonthKey: YYYYMM;
  active: boolean;
}

export interface UserSettings {
  userId: string;
  timezone: "Asia/Tokyo";
  locale: "ja-JP";
  currency: CurrencyCode;
  categories: UserCategory[];
  paymentSources: PaymentSource[];
  subscriptions: SubscriptionRule[];
  updatedAt: number;
}

export interface TransactionInputDraft {
  occurredOn: ISODate;
  categoryId: string;
  paymentSourceAccountId: string;
  transferDestinationAccountId?: string;
  amount: number;
  description?: string;
}

export const DEFAULT_CATEGORIES: UserCategory[] = [
  {
    id: "cat-salary",
    name: "給与",
    kind: "income",
    isDefault: true,
    order: 0,
  },
  { id: "cat-food", name: "食費", kind: "expense", isDefault: true, order: 1 },
  {
    id: "cat-living",
    name: "生活費",
    kind: "expense",
    isDefault: true,
    order: 2,
  },
  {
    id: "cat-fixed",
    name: "固定費",
    kind: "expense",
    isDefault: true,
    order: 3,
  },
  {
    id: "cat-others",
    name: "その他",
    kind: "expense",
    isDefault: true,
    order: 4,
  },
  {
    id: "cat-account-transfer",
    name: "口座振替",
    kind: "transfer",
    isDefault: true,
    order: 5,
  },
  {
    id: "cat-card-payment",
    name: "カード引き落とし",
    kind: "transfer",
    isDefault: true,
    order: 6,
  },
];

export const DEFAULT_PAYMENT_SOURCES: PaymentSource[] = [
  {
    id: "acc-cash",
    name: "現金",
    accountKind: "asset",
    isDefault: true,
    order: 1,
  },
  {
    id: "acc-bank",
    name: "銀行口座",
    accountKind: "asset",
    isDefault: true,
    order: 2,
  },
  {
    id: "acc-paypay",
    name: "PayPay",
    accountKind: "asset",
    isDefault: true,
    order: 3,
  },
  {
    id: "acc-credit",
    name: "クレジットカード",
    accountKind: "liability",
    isDefault: true,
    order: 4,
  },
];
