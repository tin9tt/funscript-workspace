'use client'

import { createContext, ReactNode, useReducer } from 'react'
import { FileDispatchAction, FileState, FileStateReducer } from './reducer'
import clsx from 'clsx'
import { useFileContext } from './hook'

export const defaultFileState = (): FileState => {
  return { tracks: [] }
}

export const FileContext = createContext<{
  state: FileState
  dispatch: React.Dispatch<FileDispatchAction>
}>({
  state: defaultFileState(),
  dispatch: () => {},
})

export const FileContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(FileStateReducer, defaultFileState())

  return (
    <FileContext.Provider value={{ state, dispatch }}>
      <FileDrop className={clsx('min-h-screen')}>{children}</FileDrop>
    </FileContext.Provider>
  )
}

export const FileDrop = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> &
  React.PropsWithChildren): ReactNode => {
  const { load } = useFileContext()

  return (
    <div
      className={className}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(e) => {
        e.preventDefault()
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i]
          const file = item.getAsFile()
          if (file) {
            load(file, 0)
          }
        }
      }}
    >
      {children}
    </div>
  )
}
