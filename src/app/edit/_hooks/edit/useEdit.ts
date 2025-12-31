'use client'

import { useCallback, useEffect, RefObject } from 'react'
import { FunscriptAction } from '@/lib/funscript'
import { useSelect } from '../select'
import { useActions } from '../actions'
import { usePlayback } from '../playback'
import { useGUIEdit } from '../guiEdit'
import { generateFileId } from '@/lib/utils/fileId'

interface UseEditParams {
  canvasRef: RefObject<HTMLCanvasElement>
}

export const useEdit = ({ canvasRef }: UseEditParams) => {
  // 各サブフックを使用
  const select = useSelect()
  const playback = usePlayback()

  // localStorage への保存処理
  const savePersistent = useCallback(
    (actions: FunscriptAction[]) => {
      if (!playback.file || actions.length === 0) return

      const storageKey = `edit-${generateFileId(playback.file)}`
      const data = {
        actions,
        lastModified: Date.now(),
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(data))
      } catch (e) {
        console.error('Failed to save to localStorage:', e)
      }
    },
    [playback.file],
  )

  const actionsHook = useActions(playback.file, savePersistent)

  const equalizeSelectedRange = useCallback(() => {
    const indices = [...select.selectedIndices].sort((a, b) => a - b)
    if (indices.length < 2) return false

    const isContinuous = indices.every(
      (index, i) => i === 0 || index === indices[i - 1] + 1,
    )

    if (!isContinuous) return false

    const startIndex = indices[0]
    const endIndex = indices[indices.length - 1]

    actionsHook.equalizeIntervals(startIndex, endIndex)
    return true
  }, [select.selectedIndices, actionsHook.equalizeIntervals])

  // localStorage からデータを読み込む
  useEffect(() => {
    if (!playback.file) return

    const storageKey = `edit-${generateFileId(playback.file)}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.actions && Array.isArray(data.actions)) {
          actionsHook.loadActions(data.actions)
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e)
      }
    }
  }, [playback.file, actionsHook.loadActions])

  // GUI編集機能
  const guiEdit = useGUIEdit({
    canvasRef,
    actions: actionsHook.actions,
    selectedIndices: select.selectedIndices,
    lastSelectedIndex: select.lastSelectedIndex,
    currentTime: playback.currentTime,
    setSelected: select.setSelected,
    addSelected: select.addSelected,
    setRangeSelected: select.setRangeSelected,
    clearSelected: select.clearSelected,
    updateSelectedFromBase: actionsHook.updateSelectedFromBase,
  })

  return {
    // Select
    ...select,
    // Actions
    ...actionsHook,
    equalizeSelectedRange,
    // Playback
    ...playback,
    // GUI Edit
    ...guiEdit,
  }
}
