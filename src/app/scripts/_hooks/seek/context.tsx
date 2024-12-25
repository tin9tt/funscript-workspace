'use client'

import { createContext, ReactNode, useReducer } from 'react'
import { SeekDispatchAction, SeekState, seekStateReducer } from './reducer'
import clsx from 'clsx'
import { useSeekContext } from './hook'

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

  const seekRight = () => {
    seek(currentTime + 2)
  }

  const seekLeft = () => {
    seek(currentTime - 2)
  }

  return (
    <div
      className={className}
      onKeyDown={(e) => {
        switch (e.key) {
          case 'ArrowRight':
          case 'l':
          case 'L':
            seekRight()
            break
          case 'ArrowLeft':
          case 'j':
          case 'J':
            seekLeft()
            break
          default:
            break
        }
      }}
    >
      {children}
    </div>
  )
}
