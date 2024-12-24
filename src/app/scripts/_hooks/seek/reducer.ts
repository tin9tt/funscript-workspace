export interface SeekState {
  duration: number
  currentTime: number
}

export type SeekDispatchAction =
  | { kind: 'init'; payload: { duration: number } }
  | {
      kind: 'seek'
      payload: { currentTime: number }
    }

export const seekStateReducer = (
  currState: SeekState,
  action: SeekDispatchAction,
): SeekState => {
  switch (action.kind) {
    case 'init':
      return { ...currState, duration: action.payload.duration }
    case 'seek':
      return { ...currState, currentTime: action.payload.currentTime }
    default:
      return currState
  }
}
