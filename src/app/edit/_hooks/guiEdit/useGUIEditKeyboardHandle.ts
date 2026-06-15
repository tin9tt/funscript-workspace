'use client'

import { usePlayback } from '../playback'
import { useActions } from '../actions'
import { useSelect } from '../select'
import { useEffect, useCallback, useRef } from 'react'
import { FunscriptAction } from '@/lib/funscript'

interface UseGUIEditKeyboardHandleParams {
  updateSelectedFromBase: (
    indices: number[],
    baseActions: FunscriptAction[],
    updateFn: (action: FunscriptAction, index: number) => FunscriptAction,
  ) => void
  actions: FunscriptAction[]
  selectedIndices: number[]
}

/**
 * グラフ編集のキーボード・ホイール操作を処理するフック
 */
export const useGUIEditKeyboardHandle = ({
  updateSelectedFromBase,
  actions,
  selectedIndices,
}: UseGUIEditKeyboardHandleParams) => {
  const { isPlaying, currentTime } = usePlayback()
  const { addActions, deleteActions, undo, redo } = useActions(null)
  const { clearSelected, setSelected } = useSelect()
  const copiedActionsRef = useRef<FunscriptAction[] | null>(null)

  // 選択された点を上下移動
  const moveSelected = useCallback(
    (delta: number) => {
      if (selectedIndices.length === 0) return
      updateSelectedFromBase(selectedIndices, actions, (action) => ({
        ...action,
        pos: Math.max(0, Math.min(100, action.pos + delta)),
      }))
    },
    [selectedIndices, actions, updateSelectedFromBase],
  )

  // 選択された点を拡大/縮小（pos: 50を基準）
  const scaleSelected = useCallback(
    (factor: number) => {
      if (selectedIndices.length === 0) return
      updateSelectedFromBase(selectedIndices, actions, (action) => {
        const diff = action.pos - 50
        const newPos = 50 + diff * factor
        return {
          ...action,
          pos: Math.max(0, Math.min(100, newPos)),
        }
      })
    },
    [selectedIndices, actions, updateSelectedFromBase],
  )

  const copySelected = useCallback(() => {
    if (selectedIndices.length === 0) return false

    const sortedIndices = [...selectedIndices].sort((a, b) => a - b)
    const isContinuous = sortedIndices.every(
      (index, i) => i === 0 || index === sortedIndices[i - 1] + 1,
    )
    if (!isContinuous) return false

    const selectedActions = sortedIndices
      .map((index) => actions[index])
      .filter((action): action is FunscriptAction => action !== undefined)
      .sort((a, b) => a.at - b.at)

    if (selectedActions.length === 0) return false

    const baseAt = selectedActions[0].at
    copiedActionsRef.current = selectedActions.map((action) => ({
      at: action.at - baseAt,
      pos: action.pos,
    }))

    return true
  }, [selectedIndices, actions])

  const pasteCopied = useCallback(() => {
    const copiedActions = copiedActionsRef.current
    if (!copiedActions || copiedActions.length === 0) return false

    const sortedSelectedIndices = [...selectedIndices].sort((a, b) => a - b)
    const isContinuousSelection =
      sortedSelectedIndices.length > 1 &&
      sortedSelectedIndices.every(
        (index, i) => i === 0 || index === sortedSelectedIndices[i - 1] + 1,
      )

    const selectedPasteAnchorAt =
      sortedSelectedIndices.length === 1
        ? (actions[sortedSelectedIndices[0]]?.at ?? null)
        : isContinuousSelection
          ? (actions[sortedSelectedIndices[sortedSelectedIndices.length - 1]]
              ?.at ?? null)
          : null
    const pasteStartAt = selectedPasteAnchorAt ?? currentTime
    const selectedAnchorAction =
      sortedSelectedIndices.length === 1
        ? (actions[sortedSelectedIndices[0]] ?? null)
        : isContinuousSelection
          ? (actions[sortedSelectedIndices[sortedSelectedIndices.length - 1]] ??
            null)
          : null
    const shouldMergeStartPoint =
      selectedAnchorAction !== null &&
      copiedActions.length > 0 &&
      copiedActions[0].pos === selectedAnchorAction.pos
    const sourceActions = shouldMergeStartPoint
      ? copiedActions.slice(1)
      : copiedActions

    if (sourceActions.length === 0) return false

    const pastedActions = sourceActions.map((action) => ({
      at: Math.max(0, Math.round(pasteStartAt + action.at)),
      pos: action.pos,
    }))

    const pastedActionSet = new Set(pastedActions)
    const projectedActions = [...actions, ...pastedActions].sort(
      (a, b) => a.at - b.at,
    )
    const pastedIndices = projectedActions
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => pastedActionSet.has(action))
      .map(({ index }) => index)

    addActions(pastedActions)
    setSelected(pastedIndices)

    return true
  }, [addActions, currentTime, selectedIndices, actions, setSelected])

  // キーボードによる編集操作
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey
      const target = e.target as HTMLElement | null
      const isEditableTarget =
        target !== null &&
        (target.isContentEditable ||
          target.closest('[contenteditable="true"]') !== null ||
          ['input', 'textarea', 'select'].includes(
            target.tagName.toLowerCase(),
          ))

      if (isEditableTarget) return

      // Undo: Ctrl+Z (Win) or Cmd+Z (Mac)
      if (isCtrlOrCmd && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl+Y (Win) or Cmd+Shift+Z (Mac)
      if (
        isMac
          ? isCtrlOrCmd && e.shiftKey && key === 'z'
          : isCtrlOrCmd && key === 'y'
      ) {
        e.preventDefault()
        redo()
        return
      }

      // Copy: Ctrl+C (Win) or Cmd+C (Mac)
      if (isCtrlOrCmd && key === 'c') {
        if (copySelected()) {
          e.preventDefault()
        }
        return
      }

      // Paste: Ctrl+V (Win) or Cmd+V (Mac)
      if (isCtrlOrCmd && key === 'v') {
        if (isPlaying) return
        if (pasteCopied()) {
          e.preventDefault()
        }
        return
      }

      // 再生中は編集操作を無効化（J/Kは作成モード）
      if (isPlaying) return

      // 選択されていない場合は何もしない
      if (selectedIndices.length === 0) return

      // J/K で上下移動
      if (key === 'j') {
        e.preventDefault()
        const delta = e.altKey || e.metaKey ? -1 : -5
        moveSelected(delta)
      } else if (key === 'k') {
        e.preventDefault()
        const delta = e.altKey || e.metaKey ? 1 : 5
        moveSelected(delta)
      }
      // Delete または Backspace で削除
      else if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        deleteActions(selectedIndices)
        clearSelected()
      }
    },
    [
      isPlaying,
      selectedIndices,
      moveSelected,
      deleteActions,
      clearSelected,
      undo,
      redo,
      copySelected,
      pasteCopied,
    ],
  )

  // ホイールスクロールによる編集操作
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // グラフエリアの外ではスクロール操作を無効化
      const target = e.target as HTMLElement
      if (!target.closest('[data-graph-container]')) return

      // 選択されていない場合は何もしない
      if (selectedIndices.length === 0) return

      e.preventDefault()

      const delta = e.deltaY > 0 ? -5 : 5

      if (e.altKey || e.metaKey) {
        // Alt/Option + スクロール: 拡大/縮小
        const factor = delta > 0 ? 1.1 : 0.9
        scaleSelected(factor)
      } else {
        // 通常スクロール: 上下移動
        moveSelected(delta)
      }
    },
    [selectedIndices, moveSelected, scaleSelected],
  )

  // イベントリスナーを登録
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [handleKeyDown, handleWheel])
}
