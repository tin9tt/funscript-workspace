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

  const simplifyAlternatingSelectedRange = useCallback(() => {
    const indices = [...select.selectedIndices].sort((a, b) => a - b)
    if (indices.length < 2) return false

    const isContinuous = indices.every(
      (index, i) => i === 0 || index === indices[i - 1] + 1,
    )

    if (!isContinuous) return false

    const baseActions = actionsHook.actions
    const selectedActions = indices
      .map((index) => ({ index, action: baseActions[index] }))
      .filter(
        (entry): entry is { index: number; action: FunscriptAction } =>
          entry.action !== undefined,
      )

    if (selectedActions.length < 3) return false

    const keepIndices = new Set<number>()
    keepIndices.add(selectedActions[0].index)

    let prev = selectedActions[0]
    let prevDir = 0

    for (let i = 1; i < selectedActions.length; i += 1) {
      const current = selectedActions[i]
      const delta = current.action.pos - prev.action.pos
      const dir = Math.sign(delta)

      if (dir === 0) {
        prev = current
        continue
      }

      if (prevDir === 0) {
        prevDir = dir
        prev = current
        continue
      }

      if (dir !== prevDir) {
        keepIndices.add(prev.index)
        prevDir = dir
      }

      prev = current
    }

    keepIndices.add(selectedActions[selectedActions.length - 1].index)

    const deleteIndices = indices.filter((index) => !keepIndices.has(index))
    if (deleteIndices.length === 0) return false

    actionsHook.deleteActions(deleteIndices)
    select.clearSelected()

    return true
  }, [
    select.selectedIndices,
    actionsHook.actions,
    actionsHook.deleteActions,
    select.clearSelected,
  ])

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
    simplifyAlternatingSelectedRange,
    // Playback
    ...playback,
    // GUI Edit
    ...guiEdit,
  }
}
