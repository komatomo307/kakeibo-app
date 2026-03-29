import dayjs from "dayjs";
import type {
  JournalEntry,
  PaymentSource,
  TransactionInputDraft,
  UserCategory,
  YYYYMM,
} from "../models/accounting";

interface BuildJournalPayload {
  userId: string;
  draft: TransactionInputDraft;
  categories: UserCategory[];
  paymentSources: PaymentSource[];
}

const CARD_PAYMENT_CATEGORY_NAME = "カード引き落とし";
const CREDIT_CARD_ACCOUNT_NAME = "クレジットカード";

function resolveMonthKey(occurredOn: string): YYYYMM {
  return dayjs(occurredOn).format("YYYYMM");
}

export function buildJournalEntry({
  userId,
  draft,
  categories,
  paymentSources,
}: BuildJournalPayload): JournalEntry {
  const category = categories.find((item) => item.id === draft.categoryId);
  const paymentSource = paymentSources.find(
    (item) => item.id === draft.paymentSourceAccountId,
  );

  if (!category) {
    throw new Error("カテゴリが見つかりません。");
  }

  if (!paymentSource) {
    throw new Error("支払元が見つかりません。");
  }

  const now = Date.now();
  const amount = Math.trunc(Math.abs(draft.amount));
  const isCardPayment = category.name === CARD_PAYMENT_CATEGORY_NAME;
  const isIncome = category.kind === "income";
  const isAccountTransfer = category.kind === "transfer" && !isCardPayment;
  const transferDestination = isAccountTransfer
    ? paymentSources.find(
        (item) => item.id === draft.transferDestinationAccountId,
      )
    : undefined;

  if (isAccountTransfer && !transferDestination) {
    throw new Error("振替先が見つかりません。");
  }

  const debit = isCardPayment
    ? {
        accountId: "acc-credit",
        accountName: CREDIT_CARD_ACCOUNT_NAME,
        accountKind: "liability" as const,
        amount,
      }
    : isIncome
      ? {
          accountId: paymentSource.id,
          accountName: paymentSource.name,
          accountKind: paymentSource.accountKind,
          amount,
        }
      : isAccountTransfer && transferDestination
        ? {
            accountId: transferDestination.id,
            accountName: transferDestination.name,
            accountKind: transferDestination.accountKind,
            amount,
          }
        : {
            accountId: category.id,
            accountName: category.name,
            accountKind: "expense" as const,
            amount,
          };

  const credit = isCardPayment
    ? {
        accountId: paymentSource.id,
        accountName: paymentSource.name,
        accountKind: paymentSource.accountKind,
        amount,
      }
    : isIncome
      ? {
          accountId: category.id,
          accountName: category.name,
          accountKind: "income" as const,
          amount,
        }
      : isAccountTransfer
        ? {
            accountId: paymentSource.id,
            accountName: paymentSource.name,
            accountKind: paymentSource.accountKind,
            amount,
          }
        : {
            accountId: paymentSource.id,
            accountName: paymentSource.name,
            accountKind: paymentSource.accountKind,
            amount,
          };

  return {
    id: crypto.randomUUID(),
    userId,
    monthKey: resolveMonthKey(draft.occurredOn),
    occurredOn: draft.occurredOn,
    description: draft.description,
    currency: "JPY",
    debit,
    credit,
    inputCategoryId: category.id,
    inputCategoryName: category.name,
    paymentSourceAccountId: paymentSource.id,
    paymentSourceAccountName: paymentSource.name,
    transferDestinationAccountId: transferDestination?.id,
    transferDestinationAccountName: transferDestination?.name,
    isTransferLike: isCardPayment || isAccountTransfer,
    createdAt: now,
    updatedAt: now,
  };
}
