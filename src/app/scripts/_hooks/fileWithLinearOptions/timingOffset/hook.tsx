'use client'

import { useMemo } from 'react'
import { FileState } from '../../file/reducer'

/**
 * Shifts each script action's timestamp by `timingOffsetMs` milliseconds.
 *
 * - Positive offset: script fires later than the video (device lags)
 * - Negative offset: script fires earlier than the video (device leads)
 */
export const useScriptTimingOffset = (
  { tracks, images }: FileState,
  timingOffsetMs: number,
): FileState => {
  return useMemo(() => {
    if (timingOffsetMs === 0) return { tracks, images }
    return {
      images,
      tracks: tracks.map((track) => {
        if (!track.script) return track
        return {
          ...track,
          script: {
            ...track.script,
            actions: track.script.actions
              .map((action) => ({
                ...action,
                at: action.at + timingOffsetMs,
              }))
              .filter((action) => action.at >= 0),
          },
        }
      }),
    }
  }, [images, tracks, timingOffsetMs])
}
