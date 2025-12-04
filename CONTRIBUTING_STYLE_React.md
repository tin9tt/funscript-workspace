# React コーディングスタイルガイド

このドキュメントは、本プロジェクトにおける React の実装パターンとコーディング規約を定義します。

## 目次

- [状態管理パターン](#状態管理パターン)
- [カスタムフック設計](#カスタムフック設計)
- [コンポーネント設計](#コンポーネント設計)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [TypeScript規約](#typescript規約)

## 状態管理パターン

### Context + useReducer パターン

複雑な状態管理には `Context` + `useReducer` パターンを使用します。

#### ディレクトリ構造

```text
_hooks/
  <feature>/
    context.tsx    # Context と Provider の定義
    reducer.ts     # State と Action の型定義、Reducer 実装
    hook.tsx       # カスタムフック（状態とアクションのラッパー）
    index.ts       # エクスポート
```

#### 1. Reducer の実装 (`reducer.ts`)

```typescript
// State の型定義
export interface FeatureState {
  data: DataType[]
  selectedIds: string[]
  isProcessing: boolean
  metadata: Metadata | null
}

// Action の型定義（Tagged Union 型を使用）
export type FeatureAction =
  | { kind: 'load data'; payload: { data: DataType[] } }
  | { kind: 'add item'; payload: { item: DataType } }
  | { kind: 'set selected'; payload: { ids: string[] } }
  | { kind: 'clear selected' }
  | { kind: 'update metadata'; payload: { metadata: Metadata } }

// デフォルト State
export const defaultState = (): FeatureState => ({
  data: [],
  selectedIds: [],
  isProcessing: false,
  metadata: null,
})

// Reducer 実装
export const featureReducer = (
  state: FeatureState,
  action: FeatureAction,
): FeatureState => {
  switch (action.kind) {
    case 'load data':
      return {
        ...state,
        data: action.payload.data,
        isProcessing: false,
      }

    case 'add item': {
      const newData = [...state.data, action.payload.item]
      return { ...state, data: newData }
    }

    case 'set selected':
      return {
        ...state,
        selectedIds: action.payload.ids,
      }

    case 'clear selected':
      return {
        ...state,
        selectedIds: [],
      }

    default:
      return state
  }
}
```

**重要な規約:**

- Action 型は `kind` フィールドで識別する Tagged Union 型を使用
- `payload` フィールドでデータを渡す
- Reducer は **純粋関数** であること（副作用なし）
- State の更新は **イミュータブル** に行う（スプレッド演算子を使用）
- 配列操作後にソートが必要な場合は明示的に実行

#### 2. Context と Provider の実装 (`context.tsx`)

```typescript
'use client'

import { createContext, ReactNode, useReducer } from 'react'
import {
  FeatureAction,
  FeatureState,
  featureReducer,
  defaultState,
} from './reducer'

export const FeatureContext = createContext<{
  state: FeatureState
  dispatch: React.Dispatch<FeatureAction>
}>({
  state: defaultState(),
  dispatch: () => {},
})

export const FeatureContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(featureReducer, defaultState())

  return (
    <FeatureContext.Provider value={{ state, dispatch }}>
      {children}
    </FeatureContext.Provider>
  )
}
```

**重要な規約:**

- `'use client'` ディレクティブを必ず含める
- Context のデフォルト値は型安全性のために提供
- Provider は children をラップするだけのシンプルな実装

#### 3. カスタムフックの実装 (`hook.tsx`)

```typescript
'use client'

import { useContext, useCallback } from 'react'
import { FeatureContext } from './context'

export const useFeatureContext = () => {
  const { state, dispatch } = useContext(FeatureContext)

  const loadData = useCallback(
    (data: DataType[]) => {
      dispatch({ kind: 'load data', payload: { data } })
    },
    [dispatch],
  )

  const addItem = useCallback(
    (item: DataType) => {
      dispatch({ kind: 'add item', payload: { item } })
    },
    [dispatch],
  )

  const setSelected = useCallback(
    (ids: string[]) => {
      dispatch({ kind: 'set selected', payload: { ids } })
    },
    [dispatch],
  )

  const clearSelected = useCallback(() => {
    dispatch({ kind: 'clear selected' })
  }, [dispatch])

  return {
    state,
    loadData,
    addItem,
    setSelected,
    clearSelected,
  }
}
```

**重要な規約:**

- dispatch を直接公開せず、ラッパー関数を提供
- すべてのアクション関数は `useCallback` でメモ化
- 返り値は state とアクション関数をまとめたオブジェクト

### useState パターン

シンプルな状態管理には `useState` を使用します。

```typescript
// ✅ Good: 単純な状態
const [isOpen, setIsOpen] = useState(false)
const [count, setCount] = useState(0)

// ✅ Good: 関連する状態をオブジェクトでグループ化
const [inputState, setInputState] = useState<InputStateType>('none')

// ❌ Bad: useRef で状態管理（React の再レンダリングをトリガーしない）
const stateRef = useRef<InputStateType>('none') // UI に反映されない
```

**重要な規約:**

- UI に影響する状態は必ず `useState` を使用
- `useRef` は DOM 参照や再レンダリング不要な値の保持のみに使用
- 複雑な状態ロジックは `useReducer` を検討

### useState と useReducer の選択基準

状態管理パターンは以下の基準で選択します。

#### useState を使用する場合

```typescript
// ✅ Good: 独立した状態を扱う
const [isOpen, setIsOpen] = useState(false)
const [count, setCount] = useState(0)
const [userName, setUserName] = useState('')

// ✅ Good: 複数の独立した状態
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<Error | null>(null)
const [data, setData] = useState<Data | null>(null)
```

**使用基準:**

- 独立した状態を一つ以上扱う場合
- 状態の更新ロジックが単純（値の直接的な置き換え）
- 他の状態への影響が少ない、または明確

#### useReducer を使用する場合

```typescript
// ✅ Good: 多段階フォームなど、前の入力に応じて次の入力パターンが変わる
type FormState =
  | { step: 'initial' }
  | { step: 'select-type'; selectedType: string }
  | {
      step: 'input-details'
      selectedType: string
      // selectedType に応じて必要なフィールドが変わる
      details: TypeADetails | TypeBDetails
    }
  | {
      step: 'confirm'
      selectedType: string
      details: TypeADetails | TypeBDetails
      // 前のステップの選択に基づいて利用可能なオプションが変わる
      options: AvailableOptions
    }

// アクションで状態遷移を明確に表現
case 'select-type':
  return {
    step: 'input-details',
    selectedType: action.payload.type,
    details: getInitialDetails(action.payload.type), // type に応じた初期値
  }
```

**使用基準:**

- **依存する状態を表す値を扱う場合**
  - 一つの状態の変更が他の状態に波及する
  - **前の入力値に応じて次の入力パターン（値の種類・上限値・選択肢など）が変わる多段階フォーム**
- **useEffect による値の更新が複雑になる場合**
  - useState で実装すると、複数の useEffect で状態を同期させる必要がある
  - 状態更新の順序や条件分岐が複雑になる
- 状態遷移のロジックが複雑（複数の更新パターン）
- 状態更新のロジックをテストしやすくしたい場合

```typescript
// ❌ Bad: useState で多段階フォームを管理すると複雑になる
const [step, setStep] = useState<'initial' | 'select-type' | 'input-details'>('initial')
const [selectedType, setSelectedType] = useState<string | null>(null)
const [details, setDetails] = useState<Details | null>(null)
const [availableOptions, setAvailableOptions] = useState<Options>([])

// selectedType が変わるたびに details をリセット
useEffect(() => {
  if (selectedType) {
    setDetails(getInitialDetails(selectedType))
  }
}, [selectedType])

// details が変わるたびに availableOptions を更新
useEffect(() => {
  if (details && selectedType) {
    setAvailableOptions(calculateOptions(selectedType, details))
  }
}, [details, selectedType])

// step と selectedType の整合性を保つ
useEffect(() => {
  if (step === 'initial') {
    setSelectedType(null)
    setDetails(null)
  }
}, [step])

// ✅ Good: useReducer で一貫性のある状態管理
const [state, dispatch] = useReducer(formReducer, { step: 'initial' })

// 状態遷移が明確で、不整合が起こらない
dispatch({ kind: 'select-type', payload: { type: 'typeA' } })
// reducer 内で selectedType, details, availableOptions が一度に更新される
```

## カスタムフック設計

### Hook の責務分離の原則

カスタムフックは以下の原則に基づいて設計します。

#### 1. 単一責任の原則（Single Responsibility Principle）

各フックは1つの明確な責務を持つべきです。複数の異なる関心事を扱う場合は、フックを分割します。

**判断基準:**

- **低レベルフック**: プリミティブな入力・状態管理（キーボード、マウス、タイマーなど）
- **中間レベルフック**: 状態の変換・計算ロジック
- **高レベルフック**: ビジネスロジック・副作用の実行
- **統合フック**: 複数のフックを組み合わせて機能を提供

#### 2. 依存関係の明確化

フックの依存関係は常に一方向であるべきです。循環依存を避け、階層構造を明確にします。

```text
低レベル → 中間レベル → 高レベル → 統合
  ↓          ↓           ↓         ↓
入力管理   状態変換    ロジック   機能提供
```

#### 3. 型の再利用性

各フックが定義する型は `export` し、他のフックやコンポーネントで再利用可能にします。

### Hook の階層パターン

#### パターン1: 3層アーキテクチャ（状態変換パイプライン）

入力 → 状態変換 → ビジネスロジック の順に処理を分離するパターン。

**層の責務:**

```text
Layer 1 (低レベル): 入力イベントの検知と状態への変換
  - 責務: イベントリスナーの管理、生の入力を型付き状態に変換
  - 例: キーボード入力、マウスイベント、タイマー
  - 出力: InputStateType（入力の状態を表す型）

Layer 2 (中間レベル): 状態の意味的な変換
  - 責務: Layer 1の状態をビジネスドメインの状態に変換
  - 例: 入力パターンから「作業中」「待機中」などの状態を判定
  - 出力: JobStateType（ビジネスロジックで使用する状態型）

Layer 3 (高レベル): ビジネスロジックの実行
  - 責務: Layer 2の状態に基づいて実際のアクションを実行
  - 例: データの追加、削除、更新などの副作用
  - 出力: void（または最終的な状態）
```

**構造例:**

```typescript
// Layer 1: useKeyboardInput
// → 入力: { isPlaying: boolean }
// → 出力: InputStateType

// Layer 2: useJobState
// → 入力: { isPlaying, currentTime } + useKeyboardInput()
// → 出力: { type: JobStateType, prev: JobStateType }

// Layer 3: useRealtimeEdit
// → 入力: { isPlaying, currentTime } + useJobState()
// → 出力: void（副作用として addAction() を実行）
```

**このパターンの利点:**

- **テスタビリティ**: 各層を独立してテスト可能
- **再利用性**: 低レベルフックは他の機能でも使用可能
- **保守性**: 変更の影響範囲が明確（層を跨がない）
- **段階的な状態変換**: 複雑なロジックを理解しやすい単位に分割

**適用ケース:**

- 複数段階の状態変換が必要な場合
- 入力イベントからビジネスロジックへの変換
- 各段階の状態を個別にテストしたい場合
- 低レベルの処理を他の機能でも再利用したい場合

#### パターン2: Context統合Hook

複数のContextを束ねて、コンポーネントに簡潔なAPIを提供するパターン。

**責務:**

- **複数Contextの統合**: 関連する機能のContextをまとめて取得
- **依存関係の管理**: Context間の依存関係を内部で解決
- **統一インターフェース**: コンポーネントに対して一貫したAPIを提供

**構造:**

```text
useEdit (統合Hook)
  ├── useSelect()      → 選択機能
  ├── usePlayback()    → 再生管理
  ├── useActions()     → データ操作
  └── useGUIEdit()     → GUI編集（上記を組み合わせ）
       ↓
  統合された単一のインターフェースを返す
```

**設計のポイント:**

1. **依存順序の明確化**
   - 依存関係のないContextから先に取得
   - 依存するフックは後で呼び出す（例: `useActions(playback.file)`）

2. **選択的な公開**
   - すべてのAPIを公開する必要はない
   - コンポーネントが必要とする機能のみを選んで返す

3. **型の統合**
   - 各Contextの型を統合した新しい型を定義することも可能
   - または単純にスプレッド演算子で結合

**このパターンの利点:**

- **API の一貫性**: コンポーネントから見たインターフェースが統一される
- **依存関係の隠蔽**: 内部で使用する複数のContextを隠蔽
- **拡張性**: 新しい機能を追加しても呼び出し側は変更不要
- **テスト容易性**: 統合フックをモックすれば全機能をモック可能

**適用ケース:**

- 複数のContextを使用する複雑な機能
- コンポーネントに提供するAPIをシンプルにしたい場合
- 複数の関連機能を1つのインターフェースでまとめたい場合

#### パターン3: 一時バッファパターン（tmpActions）

編集操作の履歴を肥大化させずに、リアルタイムなフィードバックを提供するパターン。

**問題:**

連続した編集操作（ドラッグ、連続キー入力、ホイール）で、操作ごとに履歴を記録すると：

- 履歴スタックが膨大になる
- Undo/Redoの単位が細かすぎて使いにくい
- しかし即座の視覚的フィードバックは必要

**解決策:**

```text
編集開始
  ↓
[一時バッファに変更を蓄積]
  - tmpActions: 編集中の状態（即座にUIに反映）
  - baseActions: 編集開始時の状態（参照用に保持）
  - isEditing: 編集中フラグ
  ↓
編集中の操作（複数回）
  - すべてtmpActionsに反映（履歴には記録しない）
  - タイマーをリセット
  ↓
編集終了（一定時間操作なし）
  ↓
[コミット: 履歴に1エントリ追加]
  - tmpActionsをbaseActionsと比較して差分を計算
  - updateSelectedFromBase()で履歴に追加
  - tmpActionsをクリア
```

**設計のポイント:**

1. **二重管理（state + ref）**
   - **state**: UIの再レンダリングをトリガー
   - **ref**: コミット時のクロージャ問題を回避（最新値を確実に取得）

2. **遅延コミット**
   - 編集操作のたびにタイマーをリセット
   - 最後の操作から一定時間（300ms推奨）後にコミット

3. **透過的なAPI**
   - `effectiveActions`: 編集中は`tmpActions`、通常時は`actions`
   - 呼び出し側は編集状態を意識する必要なし

**このパターンの利点:**

- **履歴の最適化**: 連続した編集操作を1つの履歴エントリにまとめる
- **即座のフィードバック**: 編集中も視覚的に即座に反映
- **使い勝手の向上**: Undo/Redoが自然な単位で動作
- **透過的な実装**: コンポーネント側の変更が不要

**適用ケース:**

- 連続した編集操作（ドラッグ、連続キー入力、ホイールスクロール）
- 履歴管理が必要な編集機能
- リアルタイムなフィードバックが重要な場合
- 操作の「意図の単位」で履歴を記録したい場合

#### パターン4: Contextラッパーフック

Contextの値とdispatchを使いやすいAPIに変換するパターン。

**責務:**

- **dispatchの隠蔽**: 生のdispatchを公開せず、型安全な関数を提供
- **アクションの抽象化**: Actionオブジェクトの構築をフック内で行う
- **副作用の管理**: Context関連の副作用（永続化など）を集約

**構造:**

```text
ActionsContext (Context + Reducer)
  ├── state: { actions, history, ... }
  └── dispatch: (action: Action) => void
       ↓
useActions() (ラッパーフック)
  ├── loadActions(data)     → dispatch({ kind: 'load', ... })
  ├── addAction(action)     → dispatch({ kind: 'add', ... })
  └── updateSelected(...)   → dispatch({ kind: 'update-selected', ... })
       ↓
  + 副作用: 永続化、バリデーション、ログ記録など
```

**設計のポイント:**

1. **dispatchを直接公開しない**
   - typoによるバグを防止
   - IDEの補完が効く
   - アクション構造の変更が容易

2. **すべての関数をuseCallbackでメモ化**
   - Contextから提供される関数は必須
   - 依存配列は `[dispatch]` のみ（dispatchは安定）

3. **副作用の集約**
   - 永続化（localStorage、API）
   - バリデーション
   - ログ記録、分析
   - 他のContextとの同期

**このパターンの利点:**

- **型安全なAPI**: Actionオブジェクトの構造を隠蔽
- **一貫したメモ化**: パフォーマンス問題を未然に防止
- **副作用の集約**: Context関連の副作用を1箇所で管理
- **テスト容易性**: ラッパー関数をモック可能

**適用ケース:**

- Context + useReducer パターンを使用する場合
- dispatchを直接公開したくない場合
- アクション関数にビジネスロジック（バリデーション、永続化）を追加したい場合

### Hook設計のアンチパターンと良いパターン

#### アンチパターン1: 複数の責務を持つフック

##### ❌ Bad: 1つのフックが複数の責務を担当

```typescript
export const useFeature = ({ isPlaying, currentTime }: Options) => {
  // 問題: 入力管理、状態変換、ビジネスロジックが混在
  const [inputState, setInputState] = useState('none')
  const [jobState, setJobState] = useState('none')

  // 責務1: キーボード入力処理
  useEffect(() => { /* ... */ }, [isPlaying])

  // 責務2: 状態変換処理
  useEffect(() => { /* ... */ }, [inputState])

  // 責務3: ビジネスロジック
  useEffect(() => { /* ... */ }, [jobState, currentTime])

  return { inputState, jobState }
}
```

**問題点:**

- テストが困難（全体をテストする必要）
- 変更の影響範囲が不明確
- 再利用不可能（全機能がセット）
- 可読性が低い（何をするフックか不明瞭）

##### ✅ Good: 責務ごとに分割

```typescript
// 責務1: 入力管理のみ
export const useKeyboardInput = ({ isPlaying }) => { /* ... */ }

// 責務2: 状態変換のみ
export const useJobState = ({ isPlaying, currentTime }) => {
  const inputState = useKeyboardInput({ isPlaying })
  // 変換ロジック
}

// 責務3: ビジネスロジックのみ
export const useRealtimeEdit = ({ isPlaying, currentTime }) => {
  const jobState = useJobState({ isPlaying, currentTime })
  // 副作用の実行
}
```

**改善点:**

- 各層を独立してテスト可能
- 変更の影響範囲が明確（1層のみ）
- 低レベル層は他の機能でも再利用可能
- 各フックの責務が明確

#### アンチパターン2: useRefで状態管理

##### ❌ Bad: useRefでUI状態を管理

```typescript
export const useInputState = ({ isPlaying }) => {
  const inputStateRef = useRef<InputStateType>('none')
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      inputStateRef.current = 'j-pressed' // 再レンダリングされない！
    }
    // ...
  }, [isPlaying])
  
  return inputStateRef.current // 常に初期値'none'を返す
}
```

**問題点:**

- refの変更は再レンダリングをトリガーしない
- UIに状態が反映されない
- 他のフックが値の変化を検知できない
- useEffectの依存配列で使えない

##### ✅ Good: useStateで状態管理

```typescript
export const useInputState = ({ isPlaying }) => {
  const [inputState, setInputState] = useState<InputStateType>('none')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setInputState('j-pressed') // 再レンダリングをトリガー
    }
    // ...
  }, [isPlaying])

  return inputState // 常に最新の値
}
```

**useRefとuseStateの使い分け:**

| 用途 | useState | useRef |
| --- | -------- | ------ |
| UIに影響する値 | ✅ | ❌ |
| 他のフックが依存する値 | ✅ | ❌ |
| useEffectの依存配列 | ✅ | ❌ |
| DOM参照 | ❌ | ✅ |
| タイマーID | ❌ | ✅ |
| クロージャ問題の回避 | ❌ | ✅ |
| 前回の値の保持 | ❌ | ✅ |

#### アンチパターン3: 循環依存

##### ❌ Bad: フック間の循環依存

```typescript
export const useFeatureA = () => {
  const { valueB } = useFeatureB() // B に依存
  return { valueA: /* valueBを使った計算 */ }
}

export const useFeatureB = () => {
  const { valueA } = useFeatureA() // A に依存 → 循環！
  return { valueB: /* valueAを使った計算 */ }
}
```

**問題点:**

- 無限ループやスタックオーバーフロー
- どちらを先に実装すべきか不明
- テストの依存関係が複雑
- デバッグが困難

##### ✅ Good: 一方向の依存関係

```typescript
// レベル1: 独立（依存なし）
export const useFeatureA = () => {
  return { valueA: /* 独立した計算 */ }
}

// レベル2: Aに依存
export const useFeatureB = () => {
  const { valueA } = useFeatureA()
  return { valueB: /* valueAを使った計算 */ }
}

// レベル3: AとBに依存
export const useFeatureC = () => {
  const { valueA } = useFeatureA()
  const { valueB } = useFeatureB()
  return { valueC: /* valueA, valueBを使った計算 */ }
}
```

**依存関係の可視化:**

```text
✅ 正しい依存グラフ（DAG: 有向非巡回グラフ）
A → B → C
  ↘   ↗
    D

❌ 誤った依存グラフ（循環）
A ⇄ B
A → B → C → A
```

#### アンチパターン4: 過度な抽象化

##### ❌ Bad: 過度に細かく分割

```typescript
export const useKeyJ = () => {
  // Jキーだけの処理
  return isPressed
}

export const useKeyK = () => {
  // Kキーだけの処理
  return isPressed
}

export const useKeyboardInput = () => {
  const jPressed = useKeyJ()
  const kPressed = useKeyK()
  // 2つを組み合わせる...
}
```

**問題点:**

- フックの数が爆発的に増加
- 全体像が把握しにくい
- ファイル間の移動が頻繁に発生
- 抽象化のオーバーヘッド

##### ✅ Good: 適切な粒度でまとめる

```typescript
export const useKeyboardInput = ({ isPlaying }) => {
  const [inputState, setInputState] = useState<InputStateType>('none')

  useEffect(() => {
    // JとKを1つのフックで管理（密接に関連）
    const handleKeyDown = (e: KeyboardEvent) => { /* ... */ }
    // ...
  }, [isPlaying])

  return inputState
}
```

**適切な粒度の判断基準:**

| 状況 | まとめる | 分割する |
|-----|---------|---------|
| 機能的に密接に関連 | ✅ | ❌ |
| 常に一緒に使用される | ✅ | ❌ |
| 独立して再利用可能 | ❌ | ✅ |
| 異なる責務を持つ | ❌ | ✅ |
| テストしやすさが向上 | ❌ | ✅ |
| 複数の抽象化レベル | ❌ | ✅ |

**経験則:**

- 1つのフックが50行を超えたら分割を検討
- 3つ以上のuseEffectがあれば分割を検討
- ただし、関連性が高ければまとめておく

#### アンチパターン5: dispatchの直接公開

##### ❌ Bad: dispatchを直接公開

```typescript
export const useActions = () => {
  const { state, dispatch } = useContext(ActionsContext)
  return { actions: state.actions, dispatch }
}

// コンポーネント側
const { dispatch } = useActions()
dispatch({ kind: 'ad', payload: { action } }) // typo検出されない
dispatch({ kind: 'add', paylaod: { action } }) // typo検出されない
```

**問題点:**

- typoによるバグ（実行時エラー）
- IDEの補完が効かない
- Actionオブジェクトの構造変更が大変
- 使い方がコンポーネント側に散らばる

##### ✅ Good: 型安全なラッパー関数

```typescript
export const useActions = () => {
  const { state, dispatch } = useContext(ActionsContext)

  const addAction = useCallback(
    (action: FunscriptAction) => {
      dispatch({ kind: 'add', payload: { action } })
    },
    [dispatch],
  )

  return {
    actions: state.actions,
    addAction, // 型安全な関数
  }
}

// コンポーネント側
const { addAction } = useActions()
addAction({ at: 100, pos: 50 }) // 型チェックされる
```

**改善点:**

- typoはコンパイルエラー
- IDEの補完が効く
- Action構造の変更はフック内のみ
- 使い方が統一される

#### アンチパターン6: UIを返さないコンポーネント

##### ❌ Bad: nullを返すコンポーネント

```typescript
export const AutoSave = () => {
  const { state } = useFeatureContext()

  useEffect(() => {
    localStorage.setItem('data', JSON.stringify(state))
  }, [state])

  return null // UIを返さない
}

// 使用例
function Page() {
  return (
    <div>
      <AutoSave /> {/* コンポーネント？副作用？ */}
      <Content />
    </div>
  )
}
```

**問題点:**

- 意図が不明瞭（レンダリング？副作用？）
- JSXツリーが肥大化
- Reactのルールに反する（Hookの方が適切）
- パフォーマンス（不要なコンポーネントツリー）

##### ✅ Good: カスタムフックとして実装

```typescript
export const useAutoSave = () => {
  const { state } = useFeatureContext()

  useEffect(() => {
    localStorage.setItem('data', JSON.stringify(state))
  }, [state])
}

// 使用例
function Page() {
  useAutoSave() // 明確: これはフック（副作用）

  return (
    <div>
      <Content />
    </div>
  )
}
```

**判断基準:**

| 実装形態 | 使うべき | 使うべきでない |
|---------|---------|---------------|
| コンポーネント | UIを返す | UIを返さない |
| カスタムフック | 副作用のみ | JSXを返す |

### Hook設計のチェックリスト

新しいフックを作成する際は、以下をチェックします。

**責務:**

- [ ] フックは1つの明確な責務を持っているか
- [ ] 複数の関心事が混在していないか
- [ ] 適切な粒度で分割されているか

**依存関係:**

- [ ] 依存関係は一方向か（循環依存がないか）
- [ ] 階層構造が明確か
- [ ] 低レベル → 高レベルの順序が正しいか

**型安全性:**

- [ ] 型を `export` して再利用可能にしているか
- [ ] 型ガード関数を提供しているか（必要な場合）
- [ ] dispatchではなく型安全な関数を公開しているか

**状態管理:**

- [ ] UIに影響する状態は `useState` を使用しているか
- [ ] `useRef` を適切に使い分けているか
- [ ] 不要な状態を持っていないか

**パフォーマンス:**

- [ ] Contextから提供する関数は `useCallback` でメモ化しているか
- [ ] 不要な再レンダリングが発生していないか
- [ ] 依存配列は正しく設定されているか

**テスタビリティ:**

- [ ] 各層を独立してテスト可能か
- [ ] モックしやすい構造になっているか
- [ ] 副作用が適切に分離されているか

### useEffect の依存配列管理

```typescript
// ✅ Good: 必要な依存を全て列挙
useEffect(() => {
  // jobState が変化したときのみ実行
}, [jobState, currentTime, addAction, deleteLastAction])

// ❌ Bad: 依存配列を省略（eslint の警告を無視しない）
useEffect(() => {
  // ...
}) // 依存配列なし - 毎レンダリング実行される

// ❌ Bad: 必要な依存を省略
useEffect(() => {
  // jobState を使用しているのに依存配列にない
  console.log(jobState)
}, []) // jobState の変化を検知できない
```

### useCallback によるメモ化

関数のメモ化は以下の基準で判断します。

#### Context から提供する関数（必須）

```typescript
// ✅ Good: Context から提供する関数は必ず useCallback でメモ化
export const useFeatureContext = () => {
  const { state, dispatch } = useContext(FeatureContext)

  const performAction = useCallback(
    (data: ActionData) => {
      dispatch({ kind: 'perform action', payload: { data } })
    },
    [dispatch],
  )

  return { state, performAction }
}
```

**理由:** Context を使用する全てのコンポーネントが再レンダリング時に新しい関数参照を受け取るのを防ぐため。

#### props として渡される関数（条件付き）

```typescript
// ✅ Good: パフォーマンス問題がある場合のみメモ化
function ParentComponent() {
  const [data, setData] = useState([])

  // 重い子コンポーネントが再レンダリングされる問題が確認された場合
  const handleItemClick = useCallback((id: string) => {
    setData(prev => prev.filter(item => item.id !== id))
  }, [])

  return <HeavyList items={data} onItemClick={handleItemClick} />
}

// ⚠️ 基本的に不要: 軽量なコンポーネントでは過剰な最適化
function SimpleComponent() {
  const handleClick = () => console.log('clicked')
  return <Button onClick={handleClick}>Click</Button>
}
```

**使用基準:**

- パフォーマンス測定で問題が確認された場合
- 子コンポーネントが `React.memo` でメモ化されている場合
- リストレンダリングなど、同じ関数が多数のコンポーネントに渡される場合

#### useEffect や他のフックの依存配列に含まれる関数（必須）

```typescript
// ✅ Good: useEffect の依存として使う関数はメモ化
const fetchData = useCallback(async (id: string) => {
  const response = await fetch(`/api/data/${id}`)
  return response.json()
}, [])

useEffect(() => {
  fetchData(currentId).then(setData)
}, [currentId, fetchData])  // fetchData が依存配列に含まれる
```

**理由:** メモ化しないと useEffect が毎レンダリングで実行され、無限ループの原因になる可能性がある。

#### 内部関数（基本的に不要）

```typescript
// ✅ Good: 通常の内部関数はメモ化不要
function Component() {
  const [count, setCount] = useState(0)

  // メモ化不要 - 再レンダリングのコストは無視できる
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)

  return (
    <div>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}

// ❌ Bad: 不要なメモ化は可読性を下げる
const increment = useCallback(() => setCount(c => c + 1), [])
```

**重要な原則:**

- **まず動くコードを書き、パフォーマンス問題が確認されたら最適化する**
- useCallback の使用は可読性を下げるため、必要な場合のみ使用
- 「念のため」のメモ化は避ける

## コンポーネント設計

### コンポーネント分割の原則

```tsx
// ✅ Good: 機能ごとに分割、Context から必要な値を取得
function FeaturePage() {
  const { state } = useFeatureContext()
  const processedData = useFeatureLogic({
    isActive: state.isActive,
    timestamp: state.timestamp,
  })

  // バックグラウンド処理フック
  useBackgroundSync()
  useAutoSave()

  return (
    <div>
      <ComponentA />
      <ComponentB />
      <ComponentC data={processedData} />
    </div>
  )
}
```

**重要な規約:**

- **UIを持たない処理はコンポーネントではなくカスタムフックとして実装**
- 責務ごとにコンポーネントを分割
- Context を使用するコンポーネントは必ず Provider の内側で使用（Provider の配置は Next.js の layout で管理）

### Props の設計

```tsx
// ✅ Good: 必要な値だけを props として受け取る
export const DataDisplay = ({
  displayMode,
}: {
  displayMode: DisplayMode
}) => {
  const { state, updateSelection } = useFeatureContext()
  // ...
}

// ❌ Bad: 全体の state を props として受け取る
export const DataDisplay = ({ state }: { state: FeatureState }) => {
  // 不要な再レンダリングが発生しやすい
}
```

### バックグラウンド処理のカスタムフック化

UIを持たないバックグラウンド処理は、`null` を返すコンポーネントではなく、**カスタムフックとして実装**します。

```tsx
// ✅ Good: カスタムフックとして実装
export const useAutoSave = () => {
  const { state, loadData } = useFeatureContext()

  // データが変更されたら localStorage から読み込む
  useEffect(() => {
    if (!state.id) return
    const storageKey = `data-${state.id}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const data = JSON.parse(stored)
      loadData(data)
    }
  }, [state.id, loadData])

  // データが変更されたら localStorage に保存
  useEffect(() => {
    if (!state.id || !state.data) return
    const storageKey = `data-${state.id}`
    localStorage.setItem(storageKey, JSON.stringify({
      data: state.data,
      lastModified: Date.now(),
    }))
  }, [state.id, state.data])
}

// 使用例
function FeaturePage() {
  const { state } = useFeatureContext()

  // バックグラウンド処理フック
  useAutoSave()
  useBackgroundSync()

  return <div>...</div>
}

// ❌ Bad: UIを返さないのにコンポーネントとして実装
export const AutoSave = () => {
  // ... 処理
  return null // コンポーネントなのに何も返さない
}
```

**重要な規約:**

- UIを返さない処理はコンポーネントではなくカスタムフックとして実装
- フック名は `use` プレフィックスを付ける
- 依存する他のフックを wrap して副作用を実行
- コンポーネント内で他のフックと同様に呼び出す

## パフォーマンス最適化

### requestAnimationFrame による高頻度更新

HTML5 の `timeupdate` イベント（~4Hz）ではなく、`requestAnimationFrame`（~60fps）を使用:

```tsx
useEffect(() => {
  if (!state.isPlaying) return

  const mediaElement = videoRef.current
  if (!mediaElement) return

  let animationFrameId: number

  const updateTime = () => {
    setCurrentTime(mediaElement.currentTime * 1000)
    animationFrameId = requestAnimationFrame(updateTime)
  }

  animationFrameId = requestAnimationFrame(updateTime)

  return () => {
    cancelAnimationFrame(animationFrameId)
  }
}, [state.isPlaying, setCurrentTime])
```

**重要な規約:**

- 再生中のみ高頻度更新を実行
- クリーンアップ関数で必ず `cancelAnimationFrame` を呼ぶ

### 重複処理の防止

```typescript
// 状態フラグによる重複実行防止
const [noneProcessed, setNoneProcessed] = useState(false)
const [deletedForTransition, setDeletedForTransition] = useState(false)

useEffect(() => {
  switch (jobState.type) {
    case '100-0':
      if (jobState.prev === '0-0') {
        // 一度だけ実行
        if (!deletedForTransition) {
          deleteLastAction()
          setDeletedForTransition(true)
        }
        return
      }
      // 他の状態へ遷移時にフラグをリセット
      setDeletedForTransition(false)
      addAction({ at: timestamp, pos: 100 })
      break
  }
}, [jobState, deletedForTransition])
```

### Canvas 描画の最適化

```tsx
useEffect(() => {
  // 時間範囲を制限（前後10秒のみ描画）
  const minTime = Math.max(0, centerTime - 10000)
  const maxTime = centerTime + 10000

  // 表示範囲内のアクションのみフィルタ
  const visibleActions = state.actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) =>
      action.at >= minTime - 1000 && action.at <= maxTime + 1000
    )

  // 画面外の全データを描画しない
  visibleActions.forEach(({ action, index }) => {
    // ... 描画処理
  })
}, [state.actions, state.currentTime])
```

## TypeScript規約

### 型定義の原則

```typescript
// ✅ Good: Tagged Union 型で状態を表現
type ProcessState =
  | { type: 'idle' }
  | { type: 'processing'; startedAt: number }
  | { type: 'completed'; result: ResultData }
  | { type: 'error'; error: Error }

export type ProcessStateType = ProcessState['type']

// ✅ Good: 型を export して再利用可能に
export type InputMode =
  | 'none'
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
```

### Interface と Type の使い分け

```typescript
// ✅ Good: 拡張可能な構造には interface
export interface FeatureState {
  data: DataType[]
  selectedIds: string[]
  isActive: boolean
  metadata: Metadata | null
}

// ✅ Good: Union 型や複雑な型には type
export type FeatureAction =
  | { kind: 'load data'; payload: { data: DataType[] } }
  | { kind: 'add item'; payload: { item: DataType } }
  | { kind: 'update metadata'; payload: { metadata: Metadata } }

export type ResourceType = ({ kind: 'unknown' } | ImageResource | VideoResource) & {
  metadata?: ResourceMetadata
}
```

### 型ガード関数

```typescript
// リソース種別の判定
export const isImageResource = (resource: Resource): resource is ImageResource =>
  resource.type === 'image'

export const isVideoResource = (resource: Resource): resource is VideoResource =>
  resource.type === 'video'

// 使用例
if (isImageResource(resource)) {
  // resource は確実に ImageResource
  console.log(resource.width, resource.height)
}
```

## まとめ

このスタイルガイドに従うことで:

- **保守性**: 一貫したパターンで可読性が向上
- **型安全性**: TypeScript の型システムを最大限活用
- **パフォーマンス**: 適切なメモ化と最適化
- **拡張性**: 責務分離により機能追加が容易

新しいコンポーネントや機能を追加する際は、既存のコードパターンを参考にし、このガイドラインに従ってください。
