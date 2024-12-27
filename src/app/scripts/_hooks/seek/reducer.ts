export interface SeekState {
  duration: number
  isPlaying: boolean
  seeking: 0 | 1 | 2
  1: { currentTime: number }
  2: { currentTime: number }
}

export type SeekDispatchAction =
  | { kind: 'init'; payload: { duration: number } }
  | { kind: 'playpause' }
  | {
      kind: 'seek.from0' | 'seek.from1' | 'seek.from2'
      payload: { currentTime: number }
    }

export const seekStateReducer = (
  currState: SeekState,
  action: SeekDispatchAction,
): SeekState => {
  switch (action.kind) {
    case 'init':
      return { ...currState, duration: action.payload.duration }
    case 'playpause':
      return { ...currState, isPlaying: !currState.isPlaying, seeking: 0 }
    case 'seek.from0':
      return {
        ...currState,
        seeking: 0,
        1: { currentTime: action.payload.currentTime },
        2: { currentTime: action.payload.currentTime },
      }
    case 'seek.from1':
      return {
        ...currState,
        seeking: 1,
        2: { currentTime: action.payload.currentTime },
      }
    case 'seek.from2':
      return {
        ...currState,
        seeking: 2,
        1: { currentTime: action.payload.currentTime },
      }
    default:
      return currState
  }
}
