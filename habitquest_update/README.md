# HabitQuest

習慣を続けるとキャラが育つ、習慣化トラッカーWebアプリ。

## 技術構成

- Next.js 16 (App Router) + React 19
- Supabase(認証: Google OAuth / データベース: PostgreSQL + Row Level Security)
- Tailwind CSS v4
- recharts(グラフ)/ lucide-react(アイコン)

## セットアップ手順(初回のみ)

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、実際の値を入れてください。

```bash
cp .env.local.example .env.local
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` は、Supabaseのプロジェクト画面 → Project Settings → API で確認できる
anon public key(または publishable key)を貼り付けてください。

### 3. ローカルで起動

```bash
npm run dev
```

http://localhost:3000 を開いて、Googleでログインできれば成功です。

## 本番デプロイ時にやること

Vercelにデプロイしたら、以下2箇所に「本番のURL」を追加で登録する必要があります(ローカル用の設定は残したままでOKです)。

1. **Google Cloud Console** → 該当のOAuthクライアント → Authorized JavaScript origins に
   `https://あなたのアプリ.vercel.app` を追加
2. **Supabase** → Authentication → URL Configuration →
   - Site URL を `https://あなたのアプリ.vercel.app` に変更(または追加)
   - Redirect URLs に `https://あなたのアプリ.vercel.app/**` を追加

Vercel側では、Project Settings → Environment Variables に `.env.local` と同じ2つの値
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)を登録してください。

## ディレクトリ構成

```
app/
  page.js              ホーム(認証必須、Server Component)
  login/page.js         ログイン画面
  auth/callback/route.js  Google OAuthのコールバック処理
lib/
  gameLogic.js          EXP・進化段階などの純粋なロジック(数値調整はここ)
  habitsApi.js          Supabaseへの読み書き
  supabase/             Supabaseクライアントの初期化(client/server/middleware)
components/
  HabitQuestApp.jsx      アプリ本体のUI(ホーム・図鑑・カレンダー・ひろば)
proxy.js                 認証ガード(Next.js 16のmiddleware後継)
```
