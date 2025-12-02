import { FunscriptAction } from '@/lib/funscript'

export interface EditorState {
  // メディアファイル
  file: File | null
  // 編集中のアクション配列
  actions: FunscriptAction[]
  // 選択されたアクションのインデックス配列
  selectedIndices: number[]
  // 再生状態
  isPlaying: boolean
  // 現在の再生時間（ミリ秒）
  currentTime: number
  // 最後に選択したインデックス（範囲選択用）
  lastSelectedIndex: number | null
  // キー入力の状態追跡
  keyState: {
    jPressed: boolean
    kPressed: boolean
    jPressedAt: number | null
    kPressedAt: number | null
  }
  // Undo/Redo用の履歴
  history: {
    past: FunscriptAction[][]
    future: FunscriptAction[][]
  }
}

export type EditorDispatchAction =
  | { kind: 'load file'; payload: { file: File } }
  | { kind: 'load actions'; payload: { actions: FunscriptAction[] } }
  | { kind: 'add action'; payload: { action: FunscriptAction } }
  | {
      kind: 'update action'
      payload: { index: number; action: FunscriptAction }
    }
  | { kind: 'delete actions'; payload: { indices: number[] } }
  | { kind: 'delete last action' }
  | { kind: 'set selected'; payload: { indices: number[] } }
  | { kind: 'add selected'; payload: { index: number } }
  | {
      kind: 'set range selected'
      payload: { startIndex: number; endIndex: number }
    }
  | { kind: 'clear selected' }
  | { kind: 'set playing'; payload: { isPlaying: boolean } }
  | { kind: 'set current time'; payload: { time: number } }
  | { kind: 'set key state'; payload: Partial<EditorState['keyState']> }
  | { kind: 'move selected'; payload: { delta: number } }
  | { kind: 'move selected time'; payload: { deltaTime: number } }
  | { kind: 'scale selected'; payload: { factor: number } }
  | { kind: 'scale selected time'; payload: { factor: number } }
  | {
      kind: 'scale selected time from pivot'
      payload: { factor: number; pivotTime: number }
    }
  | {
      kind: 'update selected from base'
      payload: {
        indices: number[]
        baseActions: FunscriptAction[]
        updateFn: (action: FunscriptAction, index: number) => FunscriptAction
      }
    }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'clear all' }

export const defaultEditorState = (): EditorState => ({
  file: null,
  actions: [],
  selectedIndices: [],
  isPlaying: false,
  currentTime: 0,
  lastSelectedIndex: null,
  keyState: {
    jPressed: false,
    kPressed: false,
    jPressedAt: null,
    kPressedAt: null,
  },
  history: {
    past: [],
    future: [],
  },
})

// 履歴を記録するヘルパー関数
const saveToHistory = (
  state: EditorState,
  newActions: FunscriptAction[],
): EditorState => {
  const maxHistorySize = 50 // 履歴の最大サイズ
  const newPast = [...state.history.past, state.actions].slice(-maxHistorySize)

  return {
    ...state,
    actions: newActions,
    history: {
      past: newPast,
      future: [], // 新しい操作を行ったらfutureをクリア
    },
  }
}

export const EditorStateReducer = (
  state: EditorState,
  action: EditorDispatchAction,
): EditorState => {
  switch (action.kind) {
    case 'load file':
      return {
        ...state,
        file: action.payload.file,
        currentTime: 0,
        isPlaying: false,
      }

    case 'load actions':
      return {
        ...state,
        actions: [...action.payload.actions],
        selectedIndices: [],
        lastSelectedIndex: null,
        history: {
          past: [],
          future: [],
        },
      }

    case 'add action': {
      const newActions = [...state.actions, action.payload.action].sort(
        (a, b) => a.at - b.at,
      )
      return saveToHistory(state, newActions)
    }

    case 'update action': {
      const newActions = [...state.actions]
      newActions[action.payload.index] = action.payload.action
      return saveToHistory(state, newActions)
    }

    case 'delete actions': {
      const indicesToDelete = new Set(action.payload.indices)
      const newActions = state.actions.filter((_, i) => !indicesToDelete.has(i))
      return {
        ...saveToHistory(state, newActions),
        selectedIndices: [],
        lastSelectedIndex: null,
      }
    }

    case 'delete last action': {
      if (state.actions.length === 0) return state
      const newActions = state.actions.slice(0, -1)
      return saveToHistory(state, newActions)
    }

    case 'set selected':
      return {
        ...state,
        selectedIndices: action.payload.indices,
        lastSelectedIndex:
          action.payload.indices.length > 0
            ? action.payload.indices[action.payload.indices.length - 1]
            : null,
      }

    case 'add selected': {
      const newIndices = state.selectedIndices.includes(action.payload.index)
        ? state.selectedIndices.filter((i) => i !== action.payload.index)
        : [...state.selectedIndices, action.payload.index]
      return {
        ...state,
        selectedIndices: newIndices,
        lastSelectedIndex: action.payload.index,
      }
    }

    case 'set range selected': {
      const start = Math.min(action.payload.startIndex, action.payload.endIndex)
      const end = Math.max(action.payload.startIndex, action.payload.endIndex)
      const rangeIndices = []
      for (let i = start; i <= end; i++) {
        rangeIndices.push(i)
      }
      return {
        ...state,
        selectedIndices: rangeIndices,
        lastSelectedIndex: action.payload.endIndex,
      }
    }

    case 'clear selected':
      return {
        ...state,
        selectedIndices: [],
        lastSelectedIndex: null,
      }

    case 'set playing':
      return { ...state, isPlaying: action.payload.isPlaying }

    case 'set current time':
      return { ...state, currentTime: action.payload.time }

    case 'set key state':
      return {
        ...state,
        keyState: { ...state.keyState, ...action.payload },
      }

    case 'move selected': {
      const newActions = [...state.actions]
      state.selectedIndices.forEach((index) => {
        const actionItem = newActions[index]
        if (actionItem) {
          newActions[index] = {
            ...actionItem,
            pos: Math.max(
              0,
              Math.min(100, actionItem.pos + action.payload.delta),
            ),
          }
        }
      })
      return saveToHistory(state, newActions)
    }

    case 'scale selected': {
      const newActions = [...state.actions]
      state.selectedIndices.forEach((index) => {
        const actionItem = newActions[index]
        if (actionItem) {
          // pos: 50 を基準に拡大/縮小
          const diff = actionItem.pos - 50
          const newPos = 50 + diff * action.payload.factor
          newActions[index] = {
            ...actionItem,
            pos: Math.max(0, Math.min(100, newPos)),
          }
        }
      })
      return saveToHistory(state, newActions)
    }

    case 'move selected time': {
      const newActions = [...state.actions]
      state.selectedIndices.forEach((index) => {
        const actionItem = newActions[index]
        if (actionItem) {
          newActions[index] = {
            ...actionItem,
            at: Math.max(0, actionItem.at + action.payload.deltaTime),
          }
        }
      })
      // 時刻順にソート
      newActions.sort((a, b) => a.at - b.at)
      return saveToHistory(state, newActions)
    }

    case 'scale selected time': {
      if (state.selectedIndices.length === 0) return state

      // 選択されたアクションを取得
      const selectedActions = state.selectedIndices
        .map((i) => ({ index: i, action: state.actions[i] }))
        .sort((a, b) => a.action.at - b.action.at)

      // 連続しているかチェック
      let isContinuous = true
      for (let i = 0; i < selectedActions.length - 1; i++) {
        if (selectedActions[i + 1].index !== selectedActions[i].index + 1) {
          isContinuous = false
          break
        }
      }

      // 連続していない場合は何もしない
      if (!isContinuous) return state

      // 基準点（最初のアクションの時刻）
      const baseTime = selectedActions[0].action.at

      const newActions = [...state.actions]
      selectedActions.forEach(({ index, action: actionItem }) => {
        const timeDiff = actionItem.at - baseTime
        const newTime = baseTime + timeDiff * action.payload.factor
        newActions[index] = {
          ...actionItem,
          at: Math.max(0, newTime),
        }
      })

      // 時刻順にソート
      newActions.sort((a, b) => a.at - b.at)
      return saveToHistory(state, newActions)
    }

    case 'scale selected time from pivot': {
      if (state.selectedIndices.length === 0) return state

      const { factor, pivotTime } = action.payload

      // 選択されたアクションを取得
      const selectedActions = state.selectedIndices
        .map((i) => ({ index: i, action: state.actions[i] }))
        .filter((item) => item.action !== undefined)

      const newActions = [...state.actions]
      selectedActions.forEach(({ index, action: actionItem }) => {
        const timeDiff = actionItem.at - pivotTime
        const newTime = pivotTime + timeDiff * factor
        newActions[index] = {
          ...actionItem,
          at: Math.max(0, newTime),
        }
      })

      // 時刻順にソート
      newActions.sort((a, b) => a.at - b.at)
      return saveToHistory(state, newActions)
    }

    case 'update selected from base': {
      const { indices, baseActions, updateFn } = action.payload
      const newActions = [...state.actions]

      indices.forEach((index) => {
        if (baseActions[index]) {
          newActions[index] = updateFn(baseActions[index], index)
        }
      })

      // 時刻順にソート
      newActions.sort((a, b) => a.at - b.at)
      return saveToHistory(state, newActions)
    }

    case 'undo': {
      if (state.history.past.length === 0) return state

      const previous = state.history.past[state.history.past.length - 1]
      const newPast = state.history.past.slice(0, -1)

      return {
        ...state,
        actions: previous,
        history: {
          past: newPast,
          future: [state.actions, ...state.history.future],
        },
      }
    }

    case 'redo': {
      if (state.history.future.length === 0) return state

      const next = state.history.future[0]
      const newFuture = state.history.future.slice(1)

      return {
        ...state,
        actions: next,
        history: {
          past: [...state.history.past, state.actions],
          future: newFuture,
        },
      }
    }

    case 'clear all':
      return {
        ...state,
        actions: [],
        selectedIndices: [],
        lastSelectedIndex: null,
        history: {
          past: [],
          future: [],
        },
      }

    default:
      return state
  }
}
