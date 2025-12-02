'use client'

import { RefObject } from 'react'
import { FunscriptAction } from '@/lib/funscript'
import { useGUIEditInputHandle } from './useGUIEditInputHandle'

interface UseGUIEditParams {
  canvasRef: RefObject<HTMLCanvasElement>
  actions: FunscriptAction[]
  selectedIndices: number[]
  lastSelectedIndex: number | null
  currentTime: number
  setSelected: (indices: number[]) => void
  addSelected: (index: number) => void
  setRangeSelected: (startIndex: number, endIndex: number) => void
  clearSelected: () => void
  updateSelectedFromBase: (
    indices: number[],
    baseActions: FunscriptAction[],
    updateFn: (action: FunscriptAction, index: number) => FunscriptAction,
  ) => void
}

export const useGUIEdit = (params: UseGUIEditParams) => {
  const inputHandlers = useGUIEditInputHandle(params)

  return {
    ...inputHandlers,
  }
}
