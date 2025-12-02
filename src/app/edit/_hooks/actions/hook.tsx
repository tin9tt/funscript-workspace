'use client'

import { useContext, useCallback, useEffect } from 'react'
import { ActionsContext } from './context'
import { FunscriptAction } from '@/lib/funscript'

export const useActions = (
  file: File | null,
  _savePersistent?: (actions: FunscriptAction[]) => void,
) => {
  const { state, dispatch } = useContext(ActionsContext)

  const loadActions = useCallback(
    (actions: FunscriptAction[]) => {
      dispatch({ kind: 'load', payload: { actions } })
    },
    [dispatch],
  )

  const addAction = useCallback(
    (action: FunscriptAction) => {
      dispatch({ kind: 'add', payload: { action } })
    },
    [dispatch],
  )

  const updateAction = useCallback(
    (index: number, action: FunscriptAction) => {
      dispatch({ kind: 'update', payload: { index, action } })
    },
    [dispatch],
  )

  const deleteActions = useCallback(
    (indices: number[]) => {
      dispatch({ kind: 'delete', payload: { indices } })
    },
    [dispatch],
  )

  const deleteLastAddedAction = useCallback(() => {
    dispatch({ kind: 'delete-last' })
  }, [dispatch])

  const clearActions = useCallback(() => {
    dispatch({ kind: 'clear' })
  }, [dispatch])

  const undo = useCallback(() => {
    dispatch({ kind: 'undo' })
  }, [dispatch])

  const redo = useCallback(() => {
    dispatch({ kind: 'redo' })
  }, [dispatch])

  const updateSelectedFromBase = useCallback(
    (
      indices: number[],
      baseActions: FunscriptAction[],
      updateFn: (action: FunscriptAction, index: number) => FunscriptAction,
    ) => {
      dispatch({
        kind: 'update-selected',
        payload: { indices, baseActions, updateFn },
      })
    },
    [dispatch],
  )

  // Persist actions to storage when they change
  useEffect(() => {
    if (_savePersistent && file && state.actions.length > 0) {
      _savePersistent(state.actions)
    }
  }, [state.actions, file, _savePersistent])

  return {
    actions: state.actions,
    history: state.history,
    loadActions,
    addAction,
    updateAction,
    deleteActions,
    deleteLastAddedAction,
    clearActions,
    undo,
    redo,
    updateSelectedFromBase,
  }
}
