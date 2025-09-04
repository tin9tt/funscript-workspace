'use client'

import { useMemo } from 'react'
import { FileState } from '../../file/reducer'

export const useScriptInvert = (
  { tracks }: FileState,
  inverted: boolean,
): FileState => {
  return useMemo(() => {
    return {
      tracks: tracks.map((track) => {
        if (track.script && inverted) {
          // Invert script inverted flag
          return {
            ...track,
            script: {
              ...track.script,
              inverted: !track.script.inverted,
            },
          }
        }
        return track
      }),
    }
  }, [tracks, inverted])
}
