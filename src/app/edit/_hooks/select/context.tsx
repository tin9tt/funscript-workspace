'use client'

import { createContext, ReactNode, useReducer } from 'react'

export interface SelectState {
  selectedIndices: number[]
  lastSelectedIndex: number | null
}

export type SelectAction =
  | { kind: 'set'; payload: { indices: number[] } }
  | { kind: 'add'; payload: { index: number } }
  | { kind: 'range'; payload: { startIndex: number; endIndex: number } }
  | { kind: 'clear' }

const selectReducer = (
  state: SelectState,
  action: SelectAction,
): SelectState => {
  switch (action.kind) {
    case 'set':
      return {
        selectedIndices: action.payload.indices,
        lastSelectedIndex:
          action.payload.indices.length > 0
            ? action.payload.indices[action.payload.indices.length - 1]
            : null,
      }
    case 'add': {
      const newIndices = state.selectedIndices.includes(action.payload.index)
        ? state.selectedIndices.filter((i) => i !== action.payload.index)
        : [...state.selectedIndices, action.payload.index]
      return {
        selectedIndices: newIndices,
        lastSelectedIndex: action.payload.index,
      }
    }
    case 'range': {
      const start = Math.min(action.payload.startIndex, action.payload.endIndex)
      const end = Math.max(action.payload.startIndex, action.payload.endIndex)
      const rangeIndices = []
      for (let i = start; i <= end; i++) {
        rangeIndices.push(i)
      }
      return {
        selectedIndices: rangeIndices,
        lastSelectedIndex: action.payload.endIndex,
      }
    }
    case 'clear':
      return {
        selectedIndices: [],
        lastSelectedIndex: null,
      }
    default:
      return state
  }
}

const defaultSelectState = (): SelectState => ({
  selectedIndices: [],
  lastSelectedIndex: null,
})

export const SelectContext = createContext<{
  state: SelectState
  dispatch: React.Dispatch<SelectAction>
}>({
  state: defaultSelectState(),
  dispatch: () => {},
})

export const SelectProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(selectReducer, defaultSelectState())

  return (
    <SelectContext.Provider value={{ state, dispatch }}>
      {children}
    </SelectContext.Provider>
  )
}
