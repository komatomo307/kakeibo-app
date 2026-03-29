# 家計簿アプリ教材（初心者〜中級者向け）

## 1. このアプリで学べること

このアプリは「単式入力を保存時に複式仕訳へ変換する」構成で、次を実践的に学べます。

- React + TypeScript での画面実装
- Context API による状態管理
- Firebase Authentication / Firestore 連携
- ドメインロジック（会計ルール）と UI ロジックの分離
- 月次スナップショット方式による繰越残高管理
- Recharts / xlsx を使った可視化と帳票出力

---

## 2. 技術スタック

- フロントエンド: React, TypeScript, Vite
- ルーティング: React Router
- 状態管理: Context API + useReducer
- 認証: Firebase Authentication（Google ログイン）
- データベース: Firestore
- 日付処理: dayjs
- グラフ: Recharts
- Excel 出力: xlsx（SheetJS）
- スタイリング: Tailwind CSS

---

## 3. プロジェクト構成（要点）

- `src/app`: ルーター・レイアウトなどアプリ骨格
- `src/features`: 画面単位の機能（入力、履歴、集計、設定、認証）
- `src/state`: 認証状態・アプリ状態管理
- `src/domain`: 会計モデルと会計ロジック（純粋関数）
- `src/lib`: Firebase 初期化、Repository、Excel 出力など外部 I/O

---

## 4. エントリポイントと画面遷移

### 4.1 起動

- `src/main.tsx`
  - React の root を作成し、`AppProviders` でラップした `App` を描画します。

### 4.2 ルーティング

- `src/App.tsx`
  - `BrowserRouter` を定義し、GitHub Pages で動くよう `basename={import.meta.env.BASE_URL}` を設定。

- `src/app/router.tsx`
  - 認証状態を見て分岐:
    - 認証中: 起動メッセージ
    - 未ログイン: 認証画面
    - ログイン済み: 入力 / 履歴 / 集計 / 設定

---

## 5. 状態管理（重要）

### 5.1 認証状態

- `src/state/AuthContext.tsx`
  - 役割:
    - Google ログイン（Popup + Redirect フォールバック）
    - ログアウト
    - 認証エラーのユーザー向けメッセージ化
  - ポイント:
    - GitHub Pages で発生しやすい `auth/unauthorized-domain` を明示的に案内

### 5.2 アプリ状態

- `src/state/AppContext.tsx`
  - 役割:
    - 選択月、設定、取引一覧、月初スナップショットを保持
    - 取引の追加・更新・削除
    - 設定保存
    - 月切替時の再取得
  - ポイント:
    - `withTimeout` で通信のタイムアウト制御
    - Repository 経由で Firestore 操作を集約

---

## 6. ドメイン層（会計ロジック）

### 6.1 モデル定義

- `src/domain/models/accounting.ts`
  - `JournalEntry`（借方/貸方）
  - `UserSettings`（カテゴリ/支払元）
  - `MonthlyTransactionsMeta`（月次メタ、`balancesSnapshot` など）

### 6.2 単式 -> 複式変換

- `src/domain/accounting/autoJournal.ts`
  - 入力フォームデータを `JournalEntry` に変換
  - 支出・収入・カード引き落としを分岐して借方/貸方を決定

### 6.3 月次スナップショット

- `src/domain/accounting/openingBalance.ts`
  - 口座残高スナップショットのキー化 (`asset:xxx`, `liability:xxx`)
  - 当月増減の計算
  - 前月スナップショットとの合成

---

## 7. データアクセス層（Repository）

- `src/lib/repositories/kakeiboRepository.ts`
  - 役割:
    - Firestore の参照パス生成
    - 設定の初期化/取得/保存
    - 月次取引の取得、CRUD
    - 月初スナップショットの生成・保存
  - 代表的な Firestore パス:
    - `users/{uid}/settings/default`
    - `users/{uid}/monthly_transactions/{YYYYMM}`
    - `users/{uid}/monthly_transactions/{YYYYMM}/entries/{entryId}`

---

## 8. 画面ごとの責務

### 8.1 認証

- `src/features/auth/pages/AuthPage.tsx`
  - Google ログイン導線
  - ゲスト導線（現在は停止中として表示）

### 8.2 入力

- `src/features/input/pages/InputPage.tsx`
  - 支出/収入タブ切替

- `src/features/input/components/TransactionForm.tsx`
  - 入力フォーム
  - バリデーション
  - `buildJournalEntry` 呼び出し後に保存

### 8.3 履歴

- `src/features/history/pages/HistoryPage.tsx`
  - 当月取引の一覧表示
  - 編集モーダル
  - 削除操作

### 8.4 ダッシュボード

- `src/features/dashboard/pages/DashboardPage.tsx`
  - 収入/支出/収支増減カード
  - 支出カテゴリ円グラフ
  - 月初繰越残高（スナップショット）
  - 貸借対照表（フィルタあり）
  - 仕訳一覧

### 8.5 設定

- `src/features/settings/pages/SettingsPage.tsx`
  - カテゴリ・支払元の編集
  - Excel 出力
  - ログアウト

---

## 9. 補助ライブラリ

- `src/lib/firebase/config.ts`
  - Firebase App / Auth / Firestore 初期化

- `src/lib/export/monthlyWorkbook.ts`
  - Excel 2 シート出力（カテゴリ集計、日別明細）

---

## 10. データの流れ（保存時）

1. ユーザーが入力フォームに値を入力
2. `TransactionForm` が `buildJournalEntry` を実行
3. `AppContext.addEntry` が Repository 経由で Firestore 保存
4. 保存後に当月データを再取得
5. ダッシュボード/履歴が再描画

---

## 11. 学習のおすすめ順序

1. `src/main.tsx` -> `src/App.tsx` -> `src/app/router.tsx`
2. `src/state/AuthContext.tsx` / `src/state/AppContext.tsx`
3. `src/features/input/components/TransactionForm.tsx`
4. `src/domain/accounting/autoJournal.ts`
5. `src/lib/repositories/kakeiboRepository.ts`
6. `src/features/dashboard/pages/DashboardPage.tsx`
7. `src/domain/accounting/openingBalance.ts`

---

## 12. 発展課題（中級）

- 月次スナップショットの再計算ボタンを設定画面に追加
- 予算管理（カテゴリ別の予算と実績比較）を追加
- 入力・更新処理のテスト（Vitest）を導入
- Firestore ルールをより厳密にし、バリデーションを強化

---

## 13. まとめ

このアプリは「UI・状態管理・ドメインロジック・外部I/O」を分離した実務寄りの構成です。
特に、

- 入力はシンプル（単式）
- 保存は正確（複式）
- 表示は理解しやすい（月次スナップショット + 可視化）

という設計が学習価値の高いポイントです。
