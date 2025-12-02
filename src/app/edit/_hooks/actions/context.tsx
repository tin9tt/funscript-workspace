'use client'

import { createContext, ReactNode, useReducer } from 'react'
import { FunscriptAction } from '@/lib/funscript'

export interface ActionsState {
  actions: FunscriptAction[]
  history: {
    past: FunscriptAction[][]
    future: FunscriptAction[][]
  }
}

export type ActionsAction =
  | { kind: 'load'; payload: { actions: FunscriptAction[] } }
  | { kind: 'add'; payload: { action: FunscriptAction } }
  | { kind: 'update'; payload: { index: number; action: FunscriptAction } }
  | { kind: 'delete'; payload: { indices: number[] } }
  | { kind: 'delete-last' }
  | { kind: 'clear' }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | {
      kind: 'update-selected'
      payload: {
        indices: number[]
        baseActions: FunscriptAction[]
        updateFn: (action: FunscriptAction, index: number) => FunscriptAction
      }
    }

const MAX_HISTORY_SIZE = 50

const saveToHistory = (
  state: ActionsState,
  newActions: FunscriptAction[],
): ActionsState => {
  const newPast = [...state.history.past, state.actions].slice(
    -MAX_HISTORY_SIZE,
  )

  return {
    actions: newActions,
    history: {
      past: newPast,
      future: [],
    },
  }
}

const actionsReducer = (
  state: ActionsState,
  action: ActionsAction,
): ActionsState => {
  switch (action.kind) {
    case 'load':
      return {
        actions: [...action.payload.actions],
        history: { past: [], future: [] },
      }

    case 'add': {
      const newActions = [...state.actions, action.payload.action].sort(
        (a, b) => a.at - b.at,
      )
      return saveToHistory(state, newActions)
    }

    case 'update': {
      const newActions = [...state.actions]
      newActions[action.payload.index] = action.payload.action
      return saveToHistory(state, newActions)
    }

    case 'delete': {
      const indicesToDelete = new Set(action.payload.indices)
      const newActions = state.actions.filter((_, i) => !indicesToDelete.has(i))
      return saveToHistory(state, newActions)
    }

    case 'delete-last': {
      if (state.actions.length === 0) return state
      const newActions = state.actions.slice(0, -1)
      return saveToHistory(state, newActions)
    }

    case 'clear':
      return {
        actions: [],
        history: { past: [], future: [] },
      }

    case 'undo': {
      if (state.history.past.length === 0) return state
      const previous = state.history.past[state.history.past.length - 1]
      const newPast = state.history.past.slice(0, -1)
      return {
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
        actions: next,
        history: {
          past: [...state.history.past, state.actions],
          future: newFuture,
        },
      }
    }

    case 'update-selected': {
      const { indices, baseActions, updateFn } = action.payload
      const newActions = [...state.actions]

      indices.forEach((index) => {
        if (baseActions[index]) {
          newActions[index] = updateFn(baseActions[index], index)
        }
      })

      newActions.sort((a, b) => a.at - b.at)
      return saveToHistory(state, newActions)
    }

    default:
      return state
  }
}

const defaultActionsState = (): ActionsState => ({
  actions: [],
  history: { past: [], future: [] },
})

export const ActionsContext = createContext<{
  state: ActionsState
  dispatch: React.Dispatch<ActionsAction>
}>({
  state: defaultActionsState(),
  dispatch: () => {},
})

export const ActionsProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(actionsReducer, defaultActionsState())

  return (
    <ActionsContext.Provider value={{ state, dispatch }}>
      {children}
    </ActionsContext.Provider>
  )
}
