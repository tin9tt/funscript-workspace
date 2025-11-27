# DesignDoc: Funscript Editor

## Abstract/Summary

音声や動画を視聴しながら funscript ファイルをリアルタイムで作成できる編集画面。作成したデータはグラフ上で視覚的に編集可能。キーボード入力による直感的な作成と、マウス操作による精密な編集の両方をサポートする。

## Goals

- メディア再生中のリアルタイムな funscript 作成
- 視覚的なグラフ編集による精密な調整
- 自動補正による快適な入力体験
- localStorage による編集データの永続化
- 標準形式でのエクスポート機能

## Proposed Design

### 1. 視聴に合わせた作成機能

#### 1.1 基本的な入力方法

メディア再生中にキーボード操作で FunscriptAction を作成する。

##### **実装アーキテクチャ: 3層のHookシステム**

```text
useKeyboardInput → useJobState → useRealtimeEdit
     ↓                ↓              ↓
  入力状態          Job状態      Funscript作成
```

**1. useKeyboardInput**: キーボードの物理的な入力状態を管理

- 状態: `none` | `j-pressed` | `k-pressed` | `j-and-k-j-first` | `j-and-k-k-first`
- `e.repeat` を無視して純粋な押下/解放イベントのみを処理
- useState で状態管理（React の再レンダリングを適切にトリガー）

**2. useJobState**: 入力状態を Job（作業）状態にマッピング

- 状態: `none` | `100-0` | `0-100` | `0-0` | `100-100`
- 各状態は開始タイムスタンプ（startedAt）を保持
- 前回の状態（prev）も追跡して状態遷移を判定

**3. useRealtimeEdit**: Job状態の遷移に基づいて FunscriptAction を記録

- 状態遷移時に適切な pos 値（0 or 100）を記録
- 200ms 以内の重複アクション防止機能
- 同時押しからの片方解放時の特殊処理（deleteLastAction）

##### **J キー（下降）**

- **J down**: `{at: currentTime, pos: 100}` を記録（下降開始）
- **J up**: `{at: currentTime, pos: 0}` を記録（下降終了）
- Job状態: `100-0`（100から0に向かっている）

##### **K キー（上昇）**

- **K down**: `{at: currentTime, pos: 0}` を記録（上昇開始）
- **K up**: `{at: currentTime, pos: 100}` を記録（上昇終了）
- Job状態: `0-100`（0から100に向かっている）

#### 1.2 作成されるデータ構造

```typescript
// src/lib/funscript の FunscriptAction を使用
interface FunscriptAction {
  at: number;  // タイムスタンプ（ミリ秒）
  pos: number; // ポジション（0-100）
}

// 配列として時系列順に保持
FunscriptAction[]
```

#### 1.3 入力の自動補正

##### **補正ルール1: 重複アクション防止（200ms閾値）**

同じ pos 値のアクションが 200ms 以内に連続して記録されそうになった場合、2つ目をスキップする。

**実装詳細:**

- `useRealtimeEdit` 内で `prevAddedAction` を状態管理
- `addAction` 実行前に `prevAddedAction.pos === action.pos && action.at - prevAddedAction.at < 200` をチェック
- 条件に該当する場合は早期リターンでスキップ

**効果:**

- currentTime の高頻度更新（~60fps via requestAnimationFrame）による重複記録を防止
- 状態遷移が複数回トリガーされても同じタイムスタンプ付近では1回だけ記録

##### **補正ルール2: 同時押しからの片方解放処理**

両方のキーが押されている状態から片方だけを離した場合の特殊処理。

###### ケース1: J, K 同時押し → J を離す

- Job状態遷移: `0-0` → `0-100`
- 通常なら `pos: 0` を記録するが、直前の `pos: 0` と重複
- 処理: **直前のアクションを削除**（`deleteLastAction()`）

###### ケース2: J, K 同時押し → K を離す

- Job状態遷移: `100-100` → `100-0`
- 通常なら `pos: 100` を記録するが、直前の `pos: 100` と重複
- 処理: **直前のアクションを削除**（`deleteLastAction()`）

**実装:**

```typescript
switch (jobState.type) {
  case '100-0':
    if (jobState.prev === '0-0') {
      deleteLastAction()
      return
    }
    // ...
  case '0-100':
    if (jobState.prev === '100-100') {
      deleteLastAction()
      return
    }
    // ...
}
```

##### **補正ルール3: none状態での重複実行防止**

キーを離した後の `none` 状態で、currentTime の更新による useEffect 再実行で重複記録されるのを防ぐ。

**実装:**

- `noneProcessed` フラグを useState で管理
- `none` 状態でアクション記録後に `setNoneProcessed(true)`
- 次に他の状態（`100-0`, `0-100`, `0-0`, `100-100`）へ遷移した時に `setNoneProcessed(false)` でリセット

**動作:**

1. キー離す → `none` 状態 → アクション記録 → `noneProcessed = true`
2. currentTime 更新 → `none` のまま → `noneProcessed === true` のためスキップ
3. 次のキー押下 → 他の状態へ遷移 → `noneProcessed = false` でリセット

### 2. グラフ上での編集機能

#### 2.1 グラフ表示

線グラフで FunscriptAction の連続データを可視化。

- **Y軸**: `pos` 値
  - 100 = グラフの底部
  - 0 = グラフの天井部
- **X軸**: `at` 値（時間・ミリ秒）
- 各 FunscriptAction を点として表示し、線で結ぶ

#### 2.2 点の選択機能

##### **単一選択**

- **クリック**: 1つの FunscriptAction（点）を選択

##### **範囲選択**

- **Shift + クリック**: 最後に選択した点から、クリックした点までの範囲を選択
- 前提: 1つ以上の点が既に選択済み

##### **複数選択（追加選択）**

- **Alt + クリック** (macOS では Option + クリック): 既存選択を維持したまま点を追加選択

#### 2.3 ポジション編集（pos 値の変更）

##### **上下移動**

- **ホイールスクロール** または **J / K キー**
- 選択中の点の `pos` 値を上下に移動
- 移動量: 実装時に調整（例: 1単位または5単位）

##### **中心からの拡大/縮小**

- **Alt + ホイールスクロール** (macOS では Option + ホイールスクロール) または **Alt + J / K キー**
- `pos: 50` を基準に選択点を拡大/縮小
  - 上（拡大）: 50 より上の点はより上へ、下の点はより下へ
  - 下（縮小）: 50 に近づける

### 3. データ永続化（localStorage）

#### 3.1 保存キーの生成

音声/動画ファイルごとに一意のキーで localStorage に保存。

```typescript
// `/scripts` の generateFileId 関数と同じロジックを使用
const storageKey = `edit-${generateFileId(file)}`;
```

#### 3.2 保存データ構造

```typescript
// localStorage に保存する値
{
  actions: FunscriptAction[], // 編集中のアクション配列
  metadata?: Partial<FunscriptMeta>, // 任意のメタデータ
  lastModified: number, // 最終更新日時
}
```

#### 3.3 自動保存

- アクション追加/変更時に自動保存
- localStorage の容量制限に注意（必要に応じて警告）

### 4. エクスポート機能

#### 4.1 ファイル名

対応する音声/動画ファイルと同じ名前で `.funscript` 拡張子を付与。

```text
// 例
video.mp4 → video.funscript
audio.mp3 → audio.funscript
```

#### 4.2 エクスポート形式

`src/lib/funscript` の `Funscript` interface に準拠した JSON ファイル。

```typescript
interface Funscript {
  version?: string;
  inverted?: boolean;
  range?: number;
  metadata?: FunscriptMeta;
  actions: FunscriptAction[];
}
```

##### **エクスポート時の処理フロー**

1. localStorage から編集データを取得
2. `Funscript` 形式に整形（必要に応じて metadata を追加）
3. `sanitizeFunscript()` で検証・正規化（ソート、クランプ）
4. `JSON.stringify()` でシリアライズ
5. Blob 作成してダウンロード

### 5. UI レイアウト案

#### 5.1 画面構成

```text
┌─────────────────────────────────────┐
│ メディアプレイヤー（動画/音声）       │
│ - 再生/一時停止                      │
│ - シークバー                         │
├─────────────────────────────────────┤
│ グラフエリア（編集）                 │
│ - FunscriptAction の線グラフ         │
│ - Y軸: pos (0-100)                  │
│ - X軸: at (時間)                     │
│ - 選択ハイライト                     │
│ - 現在再生位置の表示                 │
├─────────────────────────────────────┤
│ コントロールパネル                   │
│ [エクスポート] [クリア] [設定]       │
│ 選択中: N点 | 合計: M点              │
└─────────────────────────────────────┘
```

#### 5.2 操作ガイド表示

初回利用時やヘルプとして操作方法を表示：

##### **作成モード（再生中）**

- `J`: 下降 (100→0)
- `K`: 上昇 (0→100)

##### **編集モード**

- `クリック`: 選択
- `Shift+クリック`: 範囲選択
- `Alt+クリック`: 複数選択
- `スクロール/J/K`: 移動
- `Alt+スクロール/J/K`: 拡大/縮小

### 6. 技術実装詳細

#### 6.1 使用するライブラリ・技術

- **グラフ描画**: Canvas API（パフォーマンス重視）
- **メディアプレイヤー**: HTML5 `<video>`/`<audio>` element
- **キーボードイベント**: Window level `keydown`/`keyup` listeners
- **ファイル操作**: File API, Blob
- **高頻度タイムスタンプ更新**: `requestAnimationFrame` で ~60fps

#### 6.2 状態管理アーキテクチャ

React Context + useReducer パターンで編集状態を管理（`/scripts` の既存パターンを踏襲）

##### **EditorContext 構造:**

```typescript
{
  mediaFile: File | null,
  isPlaying: boolean,
  currentTime: number,  // requestAnimationFrame で ~60fps 更新
  actions: FunscriptAction[],
  selectedIndices: number[],
  // ...その他の状態
}
```

##### **リアルタイム編集の Hook 構成:**

```typescript
// 3層アーキテクチャ
useKeyboardInput({ isPlaying })
  ↓ InputStateType を返す
useJobState({ isPlaying, currentTime })
  ↓ JobState (type + prev + startedAt) を返す
useRealtimeEdit({ isPlaying, currentTime })
  ↓ EditorContext の addAction / deleteLastAction を呼ぶ
```

**各 Hook の責務:**

1. **useKeyboardInput**
   - キーボードイベントのリスニングと状態管理
   - `e.repeat` の除外
   - useState で InputStateType を管理（React 再レンダリング対応）

2. **useJobState**
   - InputStateType を JobStateType にマッピング
   - 前回の状態（prev）と現在の状態（type）を追跡
   - 状態開始時のタイムスタンプ（startedAt）を記録

3. **useRealtimeEdit**
   - Job状態の遷移に基づいて FunscriptAction を作成
   - 重複防止ロジック（200ms閾値、noneProcessed フラグ）
   - 同時押しからの片方解放時の特殊処理（deleteLastAction）

#### 6.3 パフォーマンス最適化

##### **高頻度 currentTime 更新**

HTML5 の `timeupdate` イベントは ~4Hz（250ms間隔）と低頻度なため、`requestAnimationFrame` を使用。

```typescript
// MediaPlayer.tsx 内
useEffect(() => {
  if (!state.isPlaying) return
  
  const updateTime = () => {
    if (mediaElementRef.current) {
      setCurrentTime(mediaElementRef.current.currentTime * 1000)
    }
    rafIdRef.current = requestAnimationFrame(updateTime)
  }
  
  rafIdRef.current = requestAnimationFrame(updateTime)
  
  return () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }
  }
}, [state.isPlaying])
```

**効果:**

- ~60fps（約16ms間隔）でタイムスタンプを更新
- キー入力時の記録精度が大幅に向上

##### **大量の FunscriptAction 対応**

- Canvas API による描画最適化
- 表示範囲のみレンダリング（仮想化）- 将来実装
- デバウンス処理（localStorage保存時）

##### **メモリ管理**

- 不要なデータのクリーンアップ
- localStorage 容量監視

### 7. 今後の拡張可能性

- アンドゥ/リドゥ機能（履歴スタック）
- 複数点の一括削除
- カスタムショートカットキー設定
- pos 値の数値入力での直接編集
- グラフのズーム/パン操作
- 複数ファイル（マルチアクシス）対応
- テンプレートパターンの挿入
- AI アシスト（自動補完、パターン提案）
- コラボレーション機能（複数人での編集）

### 8. セキュリティ・エラーハンドリング

#### 8.1 入力検証

- localStorage から読み込んだデータの型チェック（`isFunscript()` 使用）
- 不正なファイル形式の拒否

#### 8.2 エラー処理

- localStorage 容量超過時の警告
- メディアファイル読み込み失敗時のフォールバック
- エクスポート失敗時のリトライ/エラーメッセージ

#### 8.3 データ保護

- 編集中データの定期的なバックアップ
- ページ離脱時の保存確認（未保存データがある場合）
