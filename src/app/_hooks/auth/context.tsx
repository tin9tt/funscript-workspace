'use client'

import { createContext, ReactNode, useReducer } from 'react'
import { AuthDispatchAction, AuthState, authStateReducer } from './reducer'

export const defaultAuthState = (): AuthState => {
  return { dlsite: { token: undefined } }
}

export const AuthContext = createContext<{
  state: AuthState
  dispatch: React.Dispatch<AuthDispatchAction>
}>({
  state: defaultAuthState(),
  dispatch: () => {},
})

export const AuthContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(authStateReducer, defaultAuthState())

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}
