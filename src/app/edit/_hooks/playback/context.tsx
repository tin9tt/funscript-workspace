'use client'

import { createContext, ReactNode, useReducer } from 'react'

export interface PlaybackState {
  file: File | null
  isPlaying: boolean
  currentTime: number
}

export type PlaybackAction =
  | { kind: 'load-file'; payload: { file: File } }
  | { kind: 'set-playing'; payload: { isPlaying: boolean } }
  | { kind: 'set-time'; payload: { time: number } }

const playbackReducer = (
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState => {
  switch (action.kind) {
    case 'load-file':
      return {
        file: action.payload.file,
        isPlaying: false,
        currentTime: 0,
      }
    case 'set-playing':
      return { ...state, isPlaying: action.payload.isPlaying }
    case 'set-time':
      return { ...state, currentTime: action.payload.time }
    default:
      return state
  }
}

const defaultPlaybackState = (): PlaybackState => ({
  file: null,
  isPlaying: false,
  currentTime: 0,
})

export const PlaybackContext = createContext<{
  state: PlaybackState
  dispatch: React.Dispatch<PlaybackAction>
}>({
  state: defaultPlaybackState(),
  dispatch: () => {},
})

export const PlaybackProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(playbackReducer, defaultPlaybackState())

  return (
    <PlaybackContext.Provider value={{ state, dispatch }}>
      {children}
    </PlaybackContext.Provider>
  )
}
