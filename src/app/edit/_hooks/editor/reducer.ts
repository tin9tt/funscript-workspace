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
  | { kind: 'scale selected'; payload: { factor: number } }
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
})

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
      }

    case 'add action': {
      const newActions = [...state.actions, action.payload.action].sort(
        (a, b) => a.at - b.at,
      )
      return { ...state, actions: newActions }
    }

    case 'update action': {
      const newActions = [...state.actions]
      newActions[action.payload.index] = action.payload.action
      return { ...state, actions: newActions }
    }

    case 'delete actions': {
      const indicesToDelete = new Set(action.payload.indices)
      const newActions = state.actions.filter((_, i) => !indicesToDelete.has(i))
      return {
        ...state,
        actions: newActions,
        selectedIndices: [],
        lastSelectedIndex: null,
      }
    }

    case 'delete last action': {
      if (state.actions.length === 0) return state
      const newActions = state.actions.slice(0, -1)
      return { ...state, actions: newActions }
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
      return { ...state, actions: newActions }
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
      return { ...state, actions: newActions }
    }

    case 'clear all':
      return defaultEditorState()

    default:
      return state
  }
}
