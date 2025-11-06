import { useContext } from 'react'
import { SeekContext } from './context'

/**
 * @param from 0 | 1 | 2
 * - 0 bidirectional with 1 and 2 (for background e.g. keyboard event)
 * - 1 | 2 unidirectional with 2 | 1 (for UI e.g. slider. Because two synced scroll events are affect both and it causes infinite loop)
 * @param options Optional configuration
 * @param options.onSeek Callback function called when seek is explicitly invoked with the new currentTime
 */
export const useSeekContext = (
  from: 0 | 1 | 2,
  options?: {
    preSeek?: (currentTime: number, isPlaying: boolean) => Promise<void>
    onSeek?: (currentTime: number, isPlaying: boolean) => Promise<void>
  },
) => {
  const { state, dispatch } = useContext(SeekContext)

  const init = (duration: number) => {
    dispatch({ kind: 'init', payload: { duration } })
  }

  const play = () => dispatch({ kind: 'play' })
  const pause = () => dispatch({ kind: 'pause' })

  const seek = async (
    currentTime: number,
    callOptions?: { skipCallback?: boolean },
  ) => {
    if (currentTime < 0) {
      currentTime = 0
    }
    if (currentTime > state.duration) {
      currentTime = state.duration
    }
    if (!callOptions?.skipCallback) {
      await options?.preSeek?.(currentTime, state.isPlaying)
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
    if (callOptions?.skipCallback) return
    // Call the onSeek callback if provided with the new currentTime
    await options?.onSeek?.(currentTime, state.isPlaying)
  }

  const syncPlayStateOnFinish = () => {
    // make isPlaying flag `false`
    pause()
  }

  return {
    duration: state.duration,
    number: from,
    isPlaying: state.isPlaying,
    seeking: state.seeking,
    /**
     * seconds
     */
    currentTime:
      from === 0
        ? state.seeking === 2
          ? state[1].currentTime
          : state[2].currentTime
        : state[from].currentTime,
    init,
    play,
    pause,
    seek,
    syncPlayStateOnFinish,
  }
}
