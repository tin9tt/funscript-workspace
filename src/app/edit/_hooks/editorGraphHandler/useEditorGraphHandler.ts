'use client'

import { usePlayback } from '../playback'
import { useActions } from '../actions'
import { useSelect } from '../select'
import { useEffect, useCallback } from 'react'

/**
 * グラフ編集のキーボード・ホイール操作を処理するフック
 * UI を持たないため、コンポーネントではなくフックとして実装
 */
export const useEditorGraphHandler = () => {
  const { isPlaying } = usePlayback()
  const { actions, updateSelectedFromBase, deleteActions, undo, redo } =
    useActions(null)
  const { selectedIndices, clearSelected } = useSelect()

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

  // キーボードによる編集操作
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey

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
