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

### Hook の責務分離

機能ごとに Hook を分離し、明確な責務を持たせます。

#### 例: リアルタイム編集の3層アーキテクチャ

```typescript
// Layer 1: 低レベルの入力状態管理
export const useInputState = ({ isActive }: { isActive: boolean }) => {
  const [inputState, setInputState] = useState<InputState>('none')

  useEffect(() => {
    const handleInput = (e: Event) => {
      // ... 入力処理
    }
    window.addEventListener('input', handleInput)
    return () => window.removeEventListener('input', handleInput)
  }, [isActive])

  return inputState
}

// Layer 2: 中間レベルの状態変換
export const useProcessedState = ({
  isActive,
  timestamp
}: ProcessOptions) => {
  const inputState = useInputState({ isActive })
  const [processedState, setProcessedState] = useState<ProcessedState>({ type: 'none' })

  useEffect(() => {
    // inputState を processedState に変換
  }, [inputState, timestamp])

  return processedState
}

// Layer 3: 高レベルのビジネスロジック
export const useFeatureLogic = ({
  isActive,
  timestamp,
}: FeatureOptions) => {
  const { performAction } = useFeatureContext()
  const processedState = useProcessedState({ isActive, timestamp })

  useEffect(() => {
    // processedState に基づいてアクションを実行
  }, [processedState, timestamp, performAction])

  return processedState
}
```

**重要な規約:**

- 各 Hook は単一の責務を持つ
- 下位 Hook を組み合わせて上位 Hook を構築
- 型を export して他の Hook や Component で再利用可能にする

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
