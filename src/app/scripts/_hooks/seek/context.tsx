'use client'

import { createContext, KeyboardEvent, ReactNode, useReducer } from 'react'
import { SeekDispatchAction, SeekState, seekStateReducer } from './reducer'
import clsx from 'clsx'
import { useSeekContext } from './hook'

export const defaultSeekState = (): SeekState => {
  return {
    duration: 0,
    isPlaying: false,
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
      <KeyDetect className={clsx('min-h-screen')}>{children}</KeyDetect>
    </SeekContext.Provider>
  )
}

export const KeyDetect = ({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) => {
  const { currentTime, seek } = useSeekContext(0)

  const detectRightSeek = keyDetector(['ArrowRight', 'l', 'L'], () =>
    seek(currentTime + 2),
  )
  const detectLeftSeek = keyDetector(['ArrowLeft', 'j', 'J'], () =>
    seek(currentTime - 2),
  )

  return (
    <div
      className={className}
      onKeyDown={(e) => {
        detectRightSeek(e)
        detectLeftSeek(e)
      }}
    >
      {children}
    </div>
  )
}

const keyDetector = (keys: string[], fn: () => void) => (e: KeyboardEvent) => {
  if (keys.includes(e.key)) {
    fn()
  }
}
