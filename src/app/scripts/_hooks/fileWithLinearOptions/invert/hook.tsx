'use client'

import { useMemo } from 'react'
import { FileState } from '../../file/reducer'

export const useScriptInvert = (
  { tracks, images }: FileState,
  inverted: boolean,
): FileState => {
  return useMemo(() => {
    return {
      images,
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
  }, [images, tracks, inverted])
}
