'use client'

import { createContext, ReactNode, useReducer } from 'react'
import { SeekDispatchAction, SeekState, seekStateReducer } from './reducer'

export const defaultSeekState = (): SeekState => {
  return {
    duration: 0,
    seeking: 1,
    1: { currentTime: 0 },
    2: { currentTime: 0 },
  }
}

export const SeekContext = createContext<{
  state: SeekState
  dispatch: React.Dispatch<SeekDispatchAction>
}>({
  state: defaultSeekState(),
  dispatch: () => {},
})

export const SeekContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(seekStateReducer, defaultSeekState())

  return (
    <SeekContext.Provider value={{ state, dispatch }}>
      {children}
    </SeekContext.Provider>
  )
}
