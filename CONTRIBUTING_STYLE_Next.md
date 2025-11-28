# Next.js コーディングスタイルガイド

このドキュメントは、本プロジェクトにおける Next.js App Router の実装パターンとコーディング規約を定義します。

## 目次

- [プロジェクト構造](#プロジェクト構造)
- [App Router パターン](#app-router-パターン)
- [Client Component の使用](#client-component-の使用)
- [ファイル命名規則](#ファイル命名規則)
- [スタイリング](#スタイリング)

## プロジェクト構造

### ディレクトリ構造

```text
src/
  app/
    globals.css
    layout.tsx              # ルートレイアウト
    page.tsx                # トップページ
    _components/            # 共通コンポーネント（プライベート）
      common/               # 汎用コンポーネント
    _hooks/                 # 共通カスタムフック（プライベート）
      <feature>/
        context.tsx
        reducer.ts
    <route>/                # 各ルート
      page.tsx
      layout.tsx            # ルート専用レイアウト（必要な場合）
      _components/          # ルート専用コンポーネント
      _hooks/               # ルート専用カスタムフック
  lib/                      # 共通ライブラリ（ビジネスロジック）
    <domain>/
      index.ts
  assets/                   # 静的アセット
  env/                      # 環境変数
    index.ts
```

### ディレクトリ命名規則

#### プライベートフォルダ（`_` プレフィックス）

Next.js では `_` で始まるフォルダは **プライベートフォルダ** として扱われ、ルーティング対象から除外されます。

```text
app/
  _components/      # ✅ ルーティング対象外
  _hooks/           # ✅ ルーティング対象外
  edit/             # ✅ /edit としてルーティング
    _components/    # ✅ ルーティング対象外
    _hooks/         # ✅ ルーティング対象外
```

**使用ルール:**

- コンポーネントやフックなど、ルーティング不要なフォルダには `_` プレフィックスを付ける
- `page.tsx` や `layout.tsx` を含むフォルダには `_` を付けない

#### 機能別フォルダ

各ルート配下に機能専用のコンポーネント・フックを配置:

```text
<route>/
  page.tsx              # ページコンポーネント
  layout.tsx            # レイアウト（必要な場合）
  _components/          # ルート専用コンポーネント
  _hooks/               # ルート専用カスタムフック
    <feature>/
      context.tsx
      reducer.ts
      hook.tsx
```

**使用ルール:**

- ルート固有の機能は該当ルート配下に配置
- 複数ルートで共有する場合のみ `app/_components/` や `app/_hooks/` に移動
- ビジネスロジックは `lib/` に配置

## App Router パターン

### ページコンポーネント

#### Layout による Provider 管理

Context Provider は **layout.tsx** で管理し、page.tsx をシンプルに保ちます。

```tsx
// app/<route>/layout.tsx
'use client'

import { FeatureContextProvider } from './_hooks/<feature>'

export default function FeatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeatureContextProvider>
      {children}
    </FeatureContextProvider>
  )
}
```

```tsx
// app/<route>/page.tsx
'use client'

import { useFeatureContext } from './_hooks/<feature>'
import { useBackgroundProcess } from './_hooks/<backgroundProcess>'
import { ComponentA } from './_components/ComponentA'
import { ComponentB } from './_components/ComponentB'

export default function FeaturePage() {
  const { state } = useFeatureContext()

  return (
    <div className="container">
      <h1>Page Title</h1>
      <ComponentA />
      <ComponentB />
    </div>
  )
}
```

**重要な規約:**

- **Context Provider は layout.tsx で管理**（page.tsx 内で Provider をラップしない）
- ページコンポーネントは `default export` を使用
- Context を使用するページは必ず対応する layout.tsx を用意
- `'use client'` ディレクティブは Provider を使用する layout とページの両方に必要
- バックグラウンド処理はカスタムフックとしてページ内で呼び出す

### レイアウトコンポーネント

#### Context Provider の配置

ルート固有の Context Provider は layout.tsx で管理します。

```tsx
// app/<route>/layout.tsx - Client Component（Context Provider 使用）
'use client'

import { FeatureContextProvider } from './_hooks/<feature>'

export default function FeatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeatureContextProvider>
      {children}
    </FeatureContextProvider>
  )
}
```

#### 共通レイアウトの定義

状態管理が不要な場合は Server Component として実装できます。

```tsx
// app/<route>/layout.tsx
export default function StaticLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="layout-container">
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  )
}
```

**使用ルール:**

- **Context Provider は極力 layout.tsx で管理**（page.tsx で Provider をラップしない）
- 複数ページで共有する Context は親の layout.tsx に配置
- `children` を必ず受け取って配置
- Client Component（`'use client'`）が必要な場合:
  - Context Provider を使用する場合
  - 状態管理やイベントハンドラを使用する場合
- Server Component として実装可能な場合:
  - 静的なレイアウト構造のみを定義
  - 状態管理が不要な場合

## Client Component の使用

### 'use client' ディレクティブ

Next.js 13+ の App Router では、デフォルトで **Server Component** として扱われます。
以下の機能を使用する場合は **Client Component** として明示的に宣言します。

```tsx
'use client' // ファイルの先頭に配置

import { useState, useEffect, useContext } from 'react'
```

**Client Component が必要な場合:**

- `useState`, `useReducer`, `useEffect`, `useContext` などの React Hooks を使用
- ブラウザ API（`window`, `document`, `localStorage` など）を使用
- イベントハンドラ（`onClick`, `onChange` など）を使用
- Canvas API や requestAnimationFrame を使用

### Server Component と Client Component の分離

```tsx
// ✅ Good: Server Component（データ取得）
export default async function DataPage() {
  // サーバーサイドでデータ取得
  const data = await fetchData()

  return <DataViewer data={data} />
}

// ✅ Good: Client Component（インタラクション）
'use client'

import { useState } from 'react'

export function DataViewer({ data }: { data: Data }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? '閉じる' : '開く'}
      </button>
      {isExpanded && <div>{data.content}</div>}
    </div>
  )
}
```

**重要な規約:**

- Server Component でデータ取得やファイル操作を実行
- Client Component でユーザーインタラクションを処理
- 必要最小限のコンポーネントのみ Client Component に変換

## ファイル命名規則

### 特殊ファイル

Next.js の App Router で特別な意味を持つファイル:

| ファイル名 | 役割 |
|-----------|------|
| `page.tsx` | ルートのページコンポーネント |
| `layout.tsx` | レイアウトコンポーネント |
| `loading.tsx` | ローディング UI（Suspense） |
| `error.tsx` | エラー UI |
| `not-found.tsx` | 404 ページ |
| `route.ts` | API Route |

### 一般的なファイル

```text
_components/
  ComponentName.tsx       # PascalCase（コンポーネント）
  common/
    Button.tsx
    Input.tsx

_hooks/
  <feature>/
    context.tsx           # camelCase（機能）
    reducer.ts
    hook.tsx
    index.ts              # エクスポート用

lib/
  <domain>/
    index.ts              # camelCase（モジュール）
  utils/
    helper.ts
```

**命名規則:**

- **コンポーネントファイル**: `PascalCase.tsx`
- **フック・ユーティリティ**: `camelCase.ts`
- **インデックスファイル**: `index.ts` (再エクスポート用)

## スタイリング

### Tailwind CSS の使用

プロジェクトでは Tailwind CSS を使用します。

```tsx
// ✅ Good: Tailwind ユーティリティクラスを使用
export const Button = ({ children }: { children: React.ReactNode }) => {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      {children}
    </button>
  )
}

// ✅ Good: 動的クラスには clsx を使用
import clsx from 'clsx'

export const Card = ({
  active,
  children
}: {
  active: boolean
  children: React.ReactNode
}) => {
  return (
    <div className={clsx(
      'p-4 rounded-lg border',
      active ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'
    )}>
      {children}
    </div>
  )
}
```

### グローバルスタイル

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* カスタムスタイルは最小限に */
@layer components {
  .container {
    @apply mx-auto px-4;
  }
}
```

**重要な規約:**

- 基本的に Tailwind のユーティリティクラスを使用
- カスタム CSS は `@layer` ディレクティブで定義
- インラインスタイルは避ける（動的値が必要な場合を除く）

## 環境変数

```typescript
// src/env/index.ts
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const
```

**重要な規約:**

- 環境変数は `src/env/index.ts` で一元管理
- クライアントサイドで使用する変数は `NEXT_PUBLIC_` プレフィックスを付ける
- `as const` で型安全性を確保

## パスエイリアス

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**使用例:**

```tsx
// ✅ Good: エイリアスを使用
import { DomainLogic } from '@/lib/<domain>'
import { useFeatureContext } from '@/app/<route>/_hooks/<feature>'

// ❌ Bad: 相対パスの多用
import { DomainLogic } from '../../../lib/<domain>'
import { useFeatureContext } from '../_hooks/<feature>'
```

**重要な規約:**

- `@/` エイリアスは `src/` ディレクトリを指す
- 同じディレクトリ内は相対パス（`./`）を使用
- それ以外はエイリアスを使用

## データ取得

### Server Component でのデータ取得

```tsx
// ✅ Good: Server Component で async/await
export default async function DataPage() {
  const data = await fetchData() // サーバーサイドで実行

  return <DataView data={data} />
}
```

### Client Component でのデータ取得

```tsx
'use client'

import { useEffect, useState } from 'react'

export function DataComponent() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData().then(setData)
  }, [])

  return <div>{data}</div>
}
```

**重要な規約:**

- データ取得は可能な限り Server Component で実行
- Client Component では useEffect + useState でデータ取得
- グローバル状態管理が必要な場合は Context を使用

## まとめ

このスタイルガイドに従うことで:

- **明確なディレクトリ構造**: 機能ごとに整理された保守しやすいコード
- **適切な Server/Client 分離**: パフォーマンスとインタラクティブ性の両立
- **一貫した命名規則**: 可読性とチーム開発の効率向上
- **型安全な環境変数管理**: ランタイムエラーの削減

新しいページや機能を追加する際は、既存の構造を参考にし、このガイドラインに従ってください。
