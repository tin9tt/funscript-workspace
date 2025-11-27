'use client'

import { createContext, ReactNode, useReducer } from 'react'
import {
  EditorDispatchAction,
  EditorState,
  EditorStateReducer,
  defaultEditorState,
} from './reducer'

export const EditorContext = createContext<{
  state: EditorState
  dispatch: React.Dispatch<EditorDispatchAction>
}>({
  state: defaultEditorState(),
  dispatch: () => {},
})

export const EditorContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(EditorStateReducer, defaultEditorState())

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  )
}
