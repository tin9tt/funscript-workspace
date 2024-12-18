export interface AuthState {
  dlsite: { token?: string }
}

export type AuthDispatchAction = {
  kind: 'dlsite.login'
  payload: { token: string }
}

export const authStateReducer = (
  currState: AuthState,
  action: AuthDispatchAction,
): AuthState => {
  switch (action.kind) {
    case 'dlsite.login':
      return { ...currState, dlsite: { token: action.payload.token } }
    default:
      return currState
  }
}
