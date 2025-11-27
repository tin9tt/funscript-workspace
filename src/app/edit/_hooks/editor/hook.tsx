'use client'

import { useContext, useCallback } from 'react'
import { EditorContext } from './context'
import { FunscriptAction } from '@/lib/funscript'

export const useEditorContext = () => {
  const { state, dispatch } = useContext(EditorContext)

  const loadFile = useCallback(
    (file: File) => {
      dispatch({ kind: 'load file', payload: { file } })
    },
    [dispatch],
  )

  const loadActions = useCallback(
    (actions: FunscriptAction[]) => {
      dispatch({ kind: 'load actions', payload: { actions } })
    },
    [dispatch],
  )

  const addAction = useCallback(
    (action: FunscriptAction) => {
      dispatch({ kind: 'add action', payload: { action } })
    },
    [dispatch],
  )

  const updateAction = useCallback(
    (index: number, action: FunscriptAction) => {
      dispatch({ kind: 'update action', payload: { index, action } })
    },
    [dispatch],
  )

  const deleteActions = useCallback(
    (indices: number[]) => {
      dispatch({ kind: 'delete actions', payload: { indices } })
    },
    [dispatch],
  )

  const deleteLastAction = useCallback(() => {
    dispatch({ kind: 'delete last action' })
  }, [dispatch])

  const setSelected = useCallback(
    (indices: number[]) => {
      dispatch({ kind: 'set selected', payload: { indices } })
    },
    [dispatch],
  )

  const addSelected = useCallback(
    (index: number) => {
      dispatch({ kind: 'add selected', payload: { index } })
    },
    [dispatch],
  )

  const setRangeSelected = useCallback(
    (startIndex: number, endIndex: number) => {
      dispatch({
        kind: 'set range selected',
        payload: { startIndex, endIndex },
      })
    },
    [dispatch],
  )

  const clearSelected = useCallback(() => {
    dispatch({ kind: 'clear selected' })
  }, [dispatch])

  const setPlaying = useCallback(
    (isPlaying: boolean) => {
      dispatch({ kind: 'set playing', payload: { isPlaying } })
    },
    [dispatch],
  )

  const setCurrentTime = useCallback(
    (time: number) => {
      dispatch({ kind: 'set current time', payload: { time } })
    },
    [dispatch],
  )

  const setKeyState = useCallback(
    (keyState: {
      jPressed?: boolean
      kPressed?: boolean
      jPressedAt?: number | null
      kPressedAt?: number | null
    }) => {
      dispatch({ kind: 'set key state', payload: keyState })
    },
    [dispatch],
  )

  const moveSelected = useCallback(
    (delta: number) => {
      dispatch({ kind: 'move selected', payload: { delta } })
    },
    [dispatch],
  )

  const scaleSelected = useCallback(
    (factor: number) => {
      dispatch({ kind: 'scale selected', payload: { factor } })
    },
    [dispatch],
  )

  const clearAll = useCallback(() => {
    dispatch({ kind: 'clear all' })
  }, [dispatch])

  return {
    state,
    loadFile,
    loadActions,
    addAction,
    updateAction,
    deleteActions,
    deleteLastAction,
    setSelected,
    addSelected,
    setRangeSelected,
    clearSelected,
    setPlaying,
    setCurrentTime,
    setKeyState,
    moveSelected,
    scaleSelected,
    clearAll,
  }
}
