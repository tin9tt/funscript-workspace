import { useContext } from 'react'
import { SeekContext } from './context'

export const useSeekContext = (from: 1 | 2) => {
  const { state, dispatch } = useContext(SeekContext)

  const init = (duration: number) => {
    dispatch({ kind: 'init', payload: { duration } })
  }

  const seek = (currentTime: number) => {
    switch (from) {
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
    currentTime: state[from].currentTime,
    init,
    seek,
  }
}
