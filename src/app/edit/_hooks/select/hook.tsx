'use client'

import { useContext, useCallback } from 'react'
import { SelectContext } from './context'

export const useSelect = () => {
  const { state, dispatch } = useContext(SelectContext)

  const setSelected = useCallback(
    (indices: number[]) => {
      dispatch({ kind: 'set', payload: { indices } })
    },
    [dispatch],
  )

  const addSelected = useCallback(
    (index: number) => {
      dispatch({ kind: 'add', payload: { index } })
    },
    [dispatch],
  )

  const setRangeSelected = useCallback(
    (startIndex: number, endIndex: number) => {
      dispatch({ kind: 'range', payload: { startIndex, endIndex } })
    },
    [dispatch],
  )

  const clearSelected = useCallback(() => {
    dispatch({ kind: 'clear' })
  }, [dispatch])

  return {
    selectedIndices: state.selectedIndices,
    lastSelectedIndex: state.lastSelectedIndex,
    setSelected,
    addSelected,
    setRangeSelected,
    clearSelected,
  }
}
