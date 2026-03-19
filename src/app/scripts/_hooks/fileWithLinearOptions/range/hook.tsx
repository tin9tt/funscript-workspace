'use client'

import { useMemo } from 'react'
import { FileState } from '../../file/reducer'

export const useScriptRange = (
  { tracks, image }: FileState,
  { offset, limit }: { offset: number; limit: number },
): FileState => {
  return useMemo(() => {
    return {
      image,
      tracks: tracks.map((track) => {
        if (track.script) {
          // Apply range to script actions
          return {
            ...track,
            script: {
              ...track.script,
              actions: track.script.actions.map((action) => ({
                ...action,
                pos: rangedPos(action.pos, offset, limit),
              })),
            },
          }
        }
        return track
      }),
    }
  }, [image, tracks, offset, limit])
}

export const rangedPos = (pos: number, offset: number, limit: number) => {
  if (offset < 0 || offset >= 100) {
    throw new Error(`Invalid offset: ${offset}. Must be between 0 and 99.`)
  }
  if (limit <= 0 || limit > 100) {
    throw new Error(`Invalid limit: ${limit}. Must be between 1 and 100.`)
  }
  return Math.floor(offset + (pos * (limit - offset)) / 100)
}
