'use client'

import { useContext, useCallback } from 'react'
import { PlaybackContext } from './context'

export const usePlayback = () => {
  const { state, dispatch } = useContext(PlaybackContext)

  const loadFile = useCallback(
    (file: File) => {
      dispatch({ kind: 'load-file', payload: { file } })
    },
    [dispatch],
  )

  const setPlaying = useCallback(
    (isPlaying: boolean) => {
      dispatch({ kind: 'set-playing', payload: { isPlaying } })
    },
    [dispatch],
  )

  const setCurrentTime = useCallback(
    (time: number) => {
      dispatch({ kind: 'set-time', payload: { time } })
    },
    [dispatch],
  )

  return {
    file: state.file,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    loadFile,
    setPlaying,
    setCurrentTime,
  }
}
