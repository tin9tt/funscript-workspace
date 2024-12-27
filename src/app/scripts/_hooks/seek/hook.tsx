import { useContext } from 'react'
import { SeekContext } from './context'

export const useSeekContext = (from: 0 | 1 | 2) => {
  const { state, dispatch } = useContext(SeekContext)

  const init = (duration: number) => {
    dispatch({ kind: 'init', payload: { duration } })
  }

  const playPause = () => dispatch({ kind: 'playpause' })

  const seek = (currentTime: number) => {
    if (currentTime < 0) {
      currentTime = 0
    }
    if (currentTime > state.duration) {
      currentTime = state.duration
    }
    switch (from) {
      case 0:
        dispatch({ kind: 'seek.from0', payload: { currentTime } })
        break
      case 1:
        dispatch({ kind: 'seek.from1', payload: { currentTime } })
        break
      case 2:
        dispatch({ kind: 'seek.from2', payload: { currentTime } })
        break
    }
  }

  return {
    duration: state.duration,
    number: from,
    isPlaying: state.isPlaying,
    seeking: state.seeking,
    currentTime:
      from === 0
        ? state.seeking === 2
          ? state[1].currentTime
          : state[2].currentTime
        : state[from].currentTime,
    init,
    playPause,
    seek,
  }
}
