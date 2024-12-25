import { useContext } from 'react'
import { SeekContext } from './context'

export const useSeekContext = (from: 0 | 1 | 2) => {
  const { state, dispatch } = useContext(SeekContext)

  const init = (duration: number) => {
    dispatch({ kind: 'init', payload: { duration } })
  }

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
        dispatch({ kind: 'seek.from1', payload: { currentTime } })
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
    seeking: state.seeking,
    currentTime: from === 0 ? state[2].currentTime : state[from].currentTime,
    init,
    seek,
  }
}
