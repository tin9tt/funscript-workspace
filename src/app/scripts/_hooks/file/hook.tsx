'use client'

import { useContext } from 'react'
import { FileContext } from './context'
import { isFunscript } from '@/lib/funscript'
import { isAudio, isVideo } from './reducer'

export const useFileContext = () => {
  const { state, dispatch } = useContext(FileContext)

  const load = (file: File, index: number) => {
    if (isAudio(file) || isVideo(file)) {
      dispatch({ kind: 'load track', payload: { index, file } })
    }
    if (file.name.endsWith('.funscript') || file.type === 'application/json') {
      const r = new FileReader()
      r.onload = (e) => {
        const obj = JSON.parse(e.target?.result?.toString() ?? '')
        if (!isFunscript(obj)) {
          return
        }
        dispatch({ kind: 'load script', payload: { index, script: obj } })
      }
      r.readAsText(file)
    }
  }
  const clear = () => {
    dispatch({ kind: 'clear' })
  }

  return {
    tracks: state.tracks,
    load,
    clear,
  }
}
