import { useContext } from 'react'
import { SeekContext } from './context'

export const useSeekContext = () => {
  const { state, dispatch } = useContext(SeekContext)

  const init = (duration: number) => {
    dispatch({ kind: 'init', payload: { duration } })
  }

  const seek = (currentTime: number) => {
    dispatch({ kind: 'seek', payload: { currentTime } })
  }

  return {
    duration: state.duration,
    currentTime: state.currentTime,
    init,
    seek,
  }
}
