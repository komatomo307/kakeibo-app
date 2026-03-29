# 家計簿アプリ

モバイルファーストの家計簿 SPA です。入力は単式で、保存時に複式仕訳データへ変換して Firestore に保存します。

## セットアップ

1. 依存インストール

```bash
npm install
```

2. `.env.local` を作成（`.env.example` をコピー）

```bash
cp .env.example .env.local
```

3. `.env.local` に Firebase Web アプリの値を設定

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Firebase 作成手順（必須）

このアプリは Firestore へ保存できない場合、保存処理を失敗として扱います。

1. Firebase Console を開く
2. プロジェクトを選択
3. Build > Firestore Database > データベースを作成
4. リージョンを選択して作成
5. Build > Authentication > Sign-in method > Google を有効化
6. Build > Authentication > Settings > 承認済みドメイン に GitHub Pages のドメインを追加

例:

- `localhost`
- `<your-account>.github.io`
- 必要なら Firebase の `*.firebaseapp.com`

## 起動

```bash
npm run dev
```

## データ保存先

- `users/{userId}/settings/default`
- `users/{userId}/monthly_transactions/{YYYYMM}/entries/{entryId}`

## Firestore ルール

`firestore.rules` を Firebase にデプロイしてください。

```bash
# firebase-tools が未導入なら
npm install -g firebase-tools

firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```
